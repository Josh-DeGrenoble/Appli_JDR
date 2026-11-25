import { test } from 'node:test';
import assert from 'node:assert/strict';

// Mini environnement navigateur pour le LocalStore.
class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}
const g = globalThis as unknown as Record<string, unknown>;
g.localStorage = new MemStorage();
g.sessionStorage = new MemStorage();
g.window = { addEventListener() {} };

const { LocalStore } = await import('../src/data/localStore');
const { DND_TEMPLATE, blankCharacterValues } = await import('../src/lib/templates');

test('scénario MJ + joueur : campagne, perso, objets, dés, notes', async () => {
  const s = new LocalStore();
  const tpl = structuredClone(DND_TEMPLATE);

  // Le MJ crée la campagne
  await s.signInLocal('Maître');
  const gm = (await s.currentUser())!;
  const camp = await s.createCampaign('Les Brumes', tpl, 'Maître');
  assert.equal(camp.join_code.length, 6);

  // Le joueur rejoint
  await s.signInLocal('Aria');
  const player = (await s.currentUser())!;
  await s.joinCampaign(camp.join_code.toLowerCase(), 'Aria');
  assert.equal((await s.listCampaigns())[0].role, 'player');

  const ch = await s.createCharacter({
    campaign_id: camp.id,
    owner_id: player.id,
    name: 'Thalia',
    avatar: '🏹',
    subtitle: '',
    currency: 0,
    notes: '',
    ...blankCharacterValues({ className: 'Rôdeur' }, 20),
  });
  assert.equal(ch.resources.pv.current, 20);

  // Jets secrets et notes privées invisibles pour le MJ / les autres
  await s.addRoll({ campaign_id: camp.id, author_name: 'Aria', label: '', formula: '1d20', detail: '[3]', total: 3, secret: true });
  await s.saveNote({ campaign_id: camp.id, title: 'Secret', content: 'x', visibility: 'private' });
  await s.saveNote({ campaign_id: camp.id, title: 'Pour le MJ', content: 'y', visibility: 'gm' });

  // Retour côté MJ
  await s.signInLocal('Maître');
  assert.equal((await s.currentUser())!.id, gm.id);
  await s.addItem({ campaign_id: camp.id, character_id: ch.id, name: 'Potion', qty: 2, description: '' });
  await s.addItem({ campaign_id: camp.id, character_id: ch.id, name: 'potion', qty: 1, description: '' });
  await s.setTempHp(ch.id, 5);
  await s.applyHp(ch.id, -8); // 5 absorbés par les PV temporaires
  await s.adjustCoins(ch.id, 'po', 50);
  await s.patchSheet(ch.id, { conditions: ['poisoned'] });
  const d0 = await s.loadCampaign(camp.id);
  assert.deepEqual(d0.characters[0].resources.pv, { current: 17, max: 20 });
  assert.equal(d0.characters[0].resources.pvtemp.current, 0);
  assert.equal(d0.characters[0].sheet.className, 'Rôdeur', 'patchSheet conserve le reste');
  await s.applyHp(ch.id, -25);

  let d = await s.loadCampaign(camp.id);
  assert.equal(d.items.length, 1, 'objets identiques fusionnés');
  assert.equal(d.items[0].qty, 3);
  assert.equal(d.characters[0].resources.pv.current, 0, 'jamais négatif');
  assert.equal(d.characters[0].sheet.coins?.po, 50);
  assert.deepEqual(d.characters[0].sheet.conditions, ['poisoned']);
  assert.equal(d.rolls.length, 1, 'le MJ voit le jet secret');
  assert.deepEqual(d.notes.map((n) => n.title), ['Pour le MJ'], 'le MJ ne voit pas la note privée');

  await s.applyHp(ch.id, 999);
  d = await s.loadCampaign(camp.id);
  assert.equal(d.characters[0].resources.pv.current, 20, 'plafonné au max');

  // Transfert vers un PNJ du MJ
  const pnj = await s.createCharacter({ ...ch, owner_id: gm.id, name: 'Garde' });
  await s.transferItem(d.items[0].id, pnj.id, 1);
  d = await s.loadCampaign(camp.id);
  assert.deepEqual(
    d.items.map((i) => [i.character_id === pnj.id ? 'pnj' : 'thalia', i.qty]).sort(),
    [['pnj', 1], ['thalia', 2]]
  );

  // Un 3e joueur ne voit pas le jet secret d'Aria
  await s.signInLocal('Bram');
  await s.joinCampaign(camp.join_code, 'Bram');
  d = await s.loadCampaign(camp.id);
  assert.equal(d.rolls.length, 0);
  await assert.rejects(() => s.applyHp(ch.id, -1), /MJ/, 'un joueur ne touche pas aux PV');
  await assert.rejects(() => s.setTempHp(ch.id, 3), /MJ/);
  // Bram n'est pas propriétaire : on repasse sur Aria pour tester ses propres droits
  await s.signInLocal('Aria');
  await assert.rejects(() => s.addItem({ campaign_id: camp.id, character_id: ch.id, name: 'Or volé', qty: 1, description: '' }), /MJ/);
  await assert.rejects(() => s.adjustCoins(ch.id, 'po', 100), /MJ/);
  await s.adjustCoins(ch.id, 'po', -10); // dépenser est permis
  await assert.rejects(() => s.patchSheet(ch.id, { spells: [] }), /MJ/);
  const potion = (await s.loadCampaign(camp.id)).items.find((i) => i.character_id === ch.id)!;
  await assert.rejects(() => s.updateItem(potion.id, { qty: potion.qty + 5 }), /MJ/);
  await s.updateItem(potion.id, { qty: potion.qty - 1, equipped: true }); // consommer / équiper est permis
  await assert.rejects(() => s.updateCampaign(camp.id, { name: 'pirate' }), /MJ/);

  // Combat : le MJ prépare, le joueur fixe seulement l'initiative de son perso, PV des monstres secrets
  await s.signInLocal('Maître');
  await s.updateCampaign(camp.id, {
    combat: {
      active: false, round: 0, turn: 0,
      combatants: [
        { id: 'c1', name: 'Thalia', kind: 'pc', characterId: ch.id, avatar: '', initiative: null, initBonus: 3, conditions: [] },
        { id: 'c2', name: 'Gobelin', kind: 'monster', avatar: '', initiative: null, initBonus: 2, conditions: [], status: 'indemne' },
      ],
    },
  });
  await s.saveSecrets(camp.id, { monsters: { c2: { hp: 7, maxHp: 7, ac: 15, notes: '' } } });
  await s.signInLocal('Aria');
  await s.setInitiative(camp.id, 'c1', 17);
  await assert.rejects(() => s.setInitiative(camp.id, 'c2', 1), /personnage/);
  await assert.rejects(() => s.updateCampaign(camp.id, { combat: {} }), /MJ/);
  d = await s.loadCampaign(camp.id);
  assert.equal(d.secrets, null, 'le joueur ne voit pas les PV des monstres');
  assert.equal(d.campaign.combat!.combatants![0].initiative, 17);
  await s.signInLocal('Maître');
  assert.equal((await s.loadCampaign(camp.id)).secrets!.monsters.c2.hp, 7);

  // Action de combat du joueur (son tour) et potion de soin
  await s.updateCampaign(camp.id, { combat: { ...(await s.loadCampaign(camp.id)).campaign.combat, active: true, round: 1, turn: 0 } });
  await s.signInLocal('Aria');
  const res = await s.combatAct(camp.id, 'c1', { kind: 'auto', economy: 'action', targets: ['c2'], label: 'Projectile magique', damage: 9 });
  assert.equal(res[0].amount, 9);
  await assert.rejects(() => s.combatAct(camp.id, 'c1', { kind: 'auto', economy: 'action', targets: ['c2'], label: 'x', damage: 1 }), /Action déjà/);
  d = await s.loadCampaign(camp.id);
  assert.equal(d.campaign.combat!.combatants!.find((x) => x.id === 'c2')!.status, 'vaincu');
  await s.signInLocal('Maître');
  await s.addItem({ campaign_id: camp.id, character_id: ch.id, name: 'Potion de soins', qty: 1, description: '' });
  await s.applyHp(ch.id, -10);
  const potionItem = (await s.loadCampaign(camp.id)).items.find((i) => i.name === 'Potion de soins')!;
  await s.signInLocal('Aria');
  await s.useItem(potionItem.id, 6);
  d = await s.loadCampaign(camp.id);
  assert.equal(d.characters.find((c) => c.id === ch.id)!.resources.pv.current, 16, 'la potion soigne malgré le verrou des PV');
  assert.equal(d.items.some((i) => i.id === potionItem.id), false);
  await s.signInLocal('Maître');

  // Suppression par le MJ
  await s.signInLocal('Maître');
  await s.deleteCampaign(camp.id);
  assert.equal((await s.listCampaigns()).length, 0);
});
