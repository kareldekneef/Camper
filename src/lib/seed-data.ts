import { Category, MasterItem } from './types';

export const defaultCategories: Category[] = [
  { id: 'cat-shopping', name: 'Shopping', icon: '🛒', sortOrder: 0 },
  { id: 'cat-camper', name: 'Camper & Uitrusting', icon: '🚐', sortOrder: 1 },
  { id: 'cat-clothing', name: 'Kleding & Persoonlijk', icon: '👕', sortOrder: 2 },
  { id: 'cat-food-breakfast', name: 'Ontbijt', icon: '🥐', sortOrder: 3 },
  { id: 'cat-food-lunch', name: 'Lunch / Diner', icon: '🥩', sortOrder: 4 },
  { id: 'cat-food-snacks', name: 'Snacks & Apero', icon: '🍫', sortOrder: 5 },
  { id: 'cat-food-drinks', name: 'Dranken', icon: '🥂', sortOrder: 6 },
  { id: 'cat-electronics', name: 'Electronica & Entertainment', icon: '📦', sortOrder: 7 },
  { id: 'cat-outdoor', name: 'Buitenleven & Recreatie', icon: '🏕️', sortOrder: 8 },
  { id: 'cat-cleaning', name: 'Schoonmaak & Hygiëne', icon: '🧹', sortOrder: 9 },
  { id: 'cat-extra', name: 'Extra (meer dan 2 personen)', icon: '🛏️', sortOrder: 10 },
];

let sortCounter = 0;
let lastCategoryId = '';

function item(
  id: string,
  name: string,
  categoryId: string,
  conditions: MasterItem['conditions'] = {},
  opts?: { quantity?: number; perPerson?: boolean; weight?: number; defaultChecked?: boolean }
): MasterItem {
  if (categoryId !== lastCategoryId) {
    sortCounter = 0;
    lastCategoryId = categoryId;
  }
  return {
    id,
    name,
    categoryId,
    conditions,
    quantity: opts?.quantity,
    perPerson: opts?.perPerson,
    weight: opts?.weight,
    defaultChecked: opts?.defaultChecked,
    sortOrder: sortCounter++,
  };
}

export const defaultMasterItems: MasterItem[] = [
  // Shopping
  item('mi-shop-batterijen', 'Batterijen voor alarm', 'cat-shopping'),
  item('mi-shop-painkillers', 'Painkillers', 'cat-shopping'),
  item('mi-shop-gaviscon', 'Gaviscon', 'cat-shopping'),

  // Camper & Uitrusting
  item('mi-camper-watercontainer', 'Watercontainer voor koffie', 'cat-camper'),
  item('mi-camper-ehbo', 'EHBO-kit', 'cat-camper'),
  item('mi-camper-blauwproduct', 'Blauw product toilet', 'cat-camper'),
  item('mi-camper-handdoeken', 'Handdoeken voor vaat', 'cat-camper', {}, { quantity: 2 }),
  item('mi-camper-toiletpapier', 'Toiletpapier', 'cat-camper', {}, { quantity: 2 }),
  item('mi-camper-keukenpapier', 'Keukenpapier', 'cat-camper'),
  item('mi-camper-water', 'Water vullen', 'cat-camper'),
  item('mi-camper-adblue', 'AdBlue check', 'cat-camper'),
  item('mi-camper-hout', 'Hout', 'cat-camper'),
  item('mi-camper-solostove', 'Solo stove', 'cat-camper'),
  item('mi-camper-zekeringen', 'Reserve zekeringen / lampjes', 'cat-camper'),
  item('mi-camper-vaatwasmiddel', 'Vaatwasmiddel / spullen', 'cat-camper'),
  item('mi-camper-gas', 'Gas check', 'cat-camper'),
  item('mi-camper-multitool', 'Multitool of klein gereedschap', 'cat-camper'),
  item('mi-camper-brandblusser', 'Brandblusser / blusdeken', 'cat-camper'),
  item('mi-camper-zaklamp', 'Zaklamp of hoofdlamp', 'cat-camper'),
  item('mi-camper-levelblokken', 'Levelblokken', 'cat-camper'),
  item('mi-camper-verlengsnoer', 'Verlengsnoer + CEE verloopstekker', 'cat-camper'),
  item('mi-camper-ladder', 'Ladder', 'cat-camper'),
  item('mi-camper-campingcard', 'Camping car-card / ACSI card', 'cat-camper'),

  // Kleding & Persoonlijk
  item('mi-cloth-regenjassen', 'Regenjassen', 'cat-clothing', {}, { quantity: 1, perPerson: true }),
  item('mi-cloth-wandelstokken', 'Wandelstokken', 'cat-clothing', { activities: ['hiking'] }),
  item('mi-cloth-wandelschoenen', 'Wandelschoenen', 'cat-clothing', { activities: ['hiking'] }, { quantity: 1, perPerson: true }),
  item('mi-cloth-ondergoed', 'Ondergoed en sokken', 'cat-clothing', {}, { quantity: 1, perPerson: true }),
  item('mi-cloth-earplugs', 'Earplugs', 'cat-clothing', {}, { quantity: 1, perPerson: true }),
  item('mi-cloth-medicatie', 'Medicatie', 'cat-clothing'),
  item('mi-cloth-petten', 'Petten / muts', 'cat-clothing', {}, { quantity: 1, perPerson: true }),
  item('mi-cloth-quickdrytowels', 'Quick dry towels', 'cat-clothing', {}, { quantity: 1, perPerson: true }),
  item('mi-cloth-jeans', 'Jeans', 'cat-clothing', {}, { quantity: 1, perPerson: true }),
  item('mi-cloth-pull', 'Pull / trui', 'cat-clothing', {}, { quantity: 1, perPerson: true }),
  item('mi-cloth-warmekledij', 'Warme kledij', 'cat-clothing', { weather: ['cold', 'mixed'] }, { quantity: 1, perPerson: true }),
  item('mi-cloth-toiletzak', 'Toiletzak', 'cat-clothing', {}, { quantity: 1, perPerson: true }),
  item('mi-cloth-slaapmasker', 'Slaapmasker', 'cat-clothing', {}, { quantity: 1, perPerson: true }),
  item('mi-cloth-wasmiddel', 'Mini-wasmiddel', 'cat-clothing'),
  item('mi-cloth-waslijn', 'Waslijn + wasspelden', 'cat-clothing'),
  item('mi-cloth-insectenspray', 'Insectenspray', 'cat-clothing', { weather: ['hot', 'mixed'] }),
  item('mi-cloth-zonnecreme', 'Zonnecrème', 'cat-clothing', { weather: ['hot', 'mixed'] }),
  item('mi-cloth-zonnebril', 'Zonnebril', 'cat-clothing', {}, { quantity: 1, perPerson: true }),
  item('mi-cloth-waterschoenen', 'Waterschoenen', 'cat-clothing', { activities: ['swimming'] }, { quantity: 1, perPerson: true }),
  item('mi-cloth-slippers', 'Slippers of sandalen', 'cat-clothing', {}, { quantity: 1, perPerson: true }),
  item('mi-cloth-lichtekledij', 'Lichte kledij', 'cat-clothing', { weather: ['hot', 'mixed'] }, { quantity: 1, perPerson: true }),
  item('mi-cloth-zwembroek', 'Zwembroek', 'cat-clothing', { weather: ['hot', 'mixed'], activities: ['swimming'] }, { quantity: 1, perPerson: true }),
  item('mi-cloth-thermischondergoed', 'Thermisch ondergoed', 'cat-clothing', { weather: ['cold'] }, { quantity: 1, perPerson: true }),
  item('mi-cloth-handschoenen', 'Handschoenen', 'cat-clothing', { weather: ['cold'] }, { quantity: 1, perPerson: true }),
  item('mi-cloth-dikkesokken', 'Dikke sokken', 'cat-clothing', { weather: ['cold'] }, { quantity: 1, perPerson: true }),

  // Ontbijt
  item('mi-bfast-yoghurt', 'Yoghurt', 'cat-food-breakfast'),
  item('mi-bfast-chocomelk', 'Chocomelk', 'cat-food-breakfast'),
  item('mi-bfast-brood', 'Sandwich brood', 'cat-food-breakfast'),
  item('mi-bfast-melk', 'Houdbare melk of melkpoeder', 'cat-food-breakfast'),
  item('mi-bfast-ham', 'Ham', 'cat-food-breakfast'),
  item('mi-bfast-kaas', 'Kaas', 'cat-food-breakfast'),
  item('mi-bfast-thee', 'Thee', 'cat-food-breakfast'),
  item('mi-bfast-koffie', 'Koffie', 'cat-food-breakfast'),
  item('mi-bfast-confituur', 'Confituur', 'cat-food-breakfast'),
  item('mi-bfast-granola', 'Granola', 'cat-food-breakfast'),
  item('mi-bfast-boter', 'Boter', 'cat-food-breakfast'),
  item('mi-bfast-bacon', 'Bacon', 'cat-food-breakfast'),
  item('mi-bfast-eieren', 'Eieren', 'cat-food-breakfast'),

  // Lunch / Diner
  item('mi-lunch-bbqsaus', 'BBQ saus', 'cat-food-lunch'),
  item('mi-lunch-pepersaus', 'Peper saus', 'cat-food-lunch'),
  item('mi-lunch-mayo', 'Mayonaise', 'cat-food-lunch'),
  item('mi-lunch-olie', 'Olie', 'cat-food-lunch'),
  item('mi-lunch-diepvries', 'Diepvries eten (soep, saus)', 'cat-food-lunch'),
  item('mi-lunch-wraps', 'Wraps', 'cat-food-lunch'),
  item('mi-lunch-blikgroenten', 'Blikgroenten / soep / bonen', 'cat-food-lunch'),
  item('mi-lunch-pasta', 'Pasta / rijst', 'cat-food-lunch'),
  item('mi-lunch-kruiden', 'Provençaalse kruiden', 'cat-food-lunch'),
  item('mi-lunch-sausen', 'Andere sausen', 'cat-food-lunch'),

  // Snacks & Apero
  item('mi-snack-chocolade', 'Chocolade', 'cat-food-snacks'),
  item('mi-snack-koekjes', 'Koekjes', 'cat-food-snacks'),
  item('mi-snack-hapjes', 'Hapjes', 'cat-food-snacks'),
  item('mi-snack-olijven', 'Olijven', 'cat-food-snacks'),
  item('mi-snack-selderijzout', 'Selderijzout', 'cat-food-snacks'),
  item('mi-snack-noten', 'Noten of gedroogd fruit', 'cat-food-snacks'),
  item('mi-snack-mosterd', 'Mosterd', 'cat-food-snacks'),
  item('mi-snack-chips', 'Chips', 'cat-food-snacks'),
  item('mi-snack-ijs', 'IJs / ijscrème', 'cat-food-snacks'),

  // Dranken
  item('mi-drink-colazero', 'Cola zero', 'cat-food-drinks'),
  item('mi-drink-ijsblokjes', 'IJsblokjes', 'cat-food-drinks'),
  item('mi-drink-whiskey', 'Whiskey', 'cat-food-drinks'),
  item('mi-drink-rum', 'Rum', 'cat-food-drinks'),
  item('mi-drink-rodewijn', 'Rode wijn', 'cat-food-drinks'),
  item('mi-drink-bier', 'Bier', 'cat-food-drinks'),
  item('mi-drink-champagne', 'Champagne / cava', 'cat-food-drinks'),
  item('mi-drink-baileys', 'Baileys', 'cat-food-drinks'),
  item('mi-drink-cola', 'Cola', 'cat-food-drinks'),
  item('mi-drink-rosewijn', 'Rosé wijn', 'cat-food-drinks'),
  item('mi-drink-wittewijn', 'Witte wijn', 'cat-food-drinks'),
  item('mi-drink-amaretto', 'Amaretto', 'cat-food-drinks'),
  item('mi-drink-water', 'Water', 'cat-food-drinks'),

  // Electronica & Entertainment
  item('mi-elec-waterdichterugzak', 'Waterdichte rugzak', 'cat-electronics'),
  item('mi-elec-dagrugzak', 'Kleine dagrugzak', 'cat-electronics'),
  item('mi-elec-ereader', 'E-reader', 'cat-electronics'),
  item('mi-elec-laptop', 'Laptop', 'cat-electronics'),
  item('mi-elec-hoofdtelefoon', 'Hoofdtelefoon', 'cat-electronics'),
  item('mi-elec-kabels', 'Kabels / opladers', 'cat-electronics'),
  item('mi-elec-beamer', 'Beamer', 'cat-electronics'),
  item('mi-elec-powerbank', 'Powerbank', 'cat-electronics'),
  item('mi-elec-boeken', 'Boeken', 'cat-electronics'),

  // Buitenleven & Recreatie
  item('mi-out-zijwand', 'Zijwand', 'cat-outdoor'),
  item('mi-out-zonnescherm', 'Zonnescherm', 'cat-outdoor', { weather: ['hot', 'mixed'] }),
  item('mi-out-reisdocumenten', 'Reisdocumenten (ID, rijbewijs, verzekering)', 'cat-outdoor'),
  item('mi-out-fietsen', 'Fietsen', 'cat-outdoor', { activities: ['cycling'] }),
  item('mi-out-fietsgerief', 'Fietsgerief', 'cat-outdoor', { activities: ['cycling'] }),
  item('mi-out-petanque', 'Petanque', 'cat-outdoor', { activities: ['relaxation'] }),
  item('mi-out-kubb', 'Kubb', 'cat-outdoor', { activities: ['relaxation'] }),
  item('mi-out-camera', 'Camera + statief + tas', 'cat-outdoor', { activities: ['photography'] }),
  item('mi-out-boodschappentas', 'Opvouwbare boodschappentas', 'cat-outdoor'),
  item('mi-out-diepvriestas', 'Diepvriestas', 'cat-outdoor'),
  item('mi-out-vislijnen', 'Vislijnen', 'cat-outdoor', { activities: ['fishing'] }),
  item('mi-out-visgerief', 'Visgerief', 'cat-outdoor', { activities: ['fishing'] }),
  item('mi-out-speelgoed', 'Speelgoed', 'cat-outdoor', { minPeople: 3 }),
  item('mi-out-bbq', 'Grill / BBQ', 'cat-outdoor'),
  item('mi-out-drinkflessen', 'Drinkflessen', 'cat-outdoor', {}, { quantity: 1, perPerson: true }),

  // Schoonmaak & Hygiëne
  item('mi-clean-handgel', 'Handgel', 'cat-cleaning'),
  item('mi-clean-allesreiniger', 'Allesreiniger', 'cat-cleaning'),
  item('mi-clean-vuilniszakjes', 'Vuilniszakjes', 'cat-cleaning'),
  item('mi-clean-kuisproduct', 'Kuisproduct', 'cat-cleaning'),
  item('mi-clean-wetwipes', 'Wet wipes', 'cat-cleaning'),
  item('mi-clean-afwasbak', 'Opvouwbare afwasbak of teil', 'cat-cleaning'),
  item('mi-clean-afwasborstel', 'Afwasborstel / spons', 'cat-cleaning'),

  // Extra (meer dan 2 personen)
  item('mi-extra-isolatie', 'Isolatie voor bovenste bed', 'cat-extra', { minPeople: 3 }),
  item('mi-extra-tafel', 'Extra tafel', 'cat-extra', { minPeople: 3 }),
  item('mi-extra-stoelen', 'Extra stoelen', 'cat-extra', { minPeople: 3 }),
  item('mi-extra-kussens', 'Hoofdkussens', 'cat-extra', { minPeople: 3 }, { quantity: 1, perPerson: true }),
  item('mi-extra-onderlaken', 'Onderlaken', 'cat-extra', { minPeople: 3 }, { quantity: 1, perPerson: true }),
  item('mi-extra-dekens', 'Dekens / dons / slaapzak', 'cat-extra', { minPeople: 3 }, { quantity: 1, perPerson: true }),
  item('mi-extra-tent', 'Tent', 'cat-extra', { minPeople: 3 }),
  item('mi-extra-matras', 'Matras', 'cat-extra', { minPeople: 3 }),
  item('mi-extra-pomp', 'Pomp', 'cat-extra', { minPeople: 3 }),
];
