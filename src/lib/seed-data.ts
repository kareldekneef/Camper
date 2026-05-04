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
  // Camper & Uitrusting
  item('mi-camper-watercontainer', 'Watercontainer voor koffie', 'cat-camper', {}, { weight: 300 }),
  item('mi-camper-ehbo', 'EHBO-kit', 'cat-camper', {}, { weight: 300 }),
  item('mi-camper-blauwproduct', 'Blauw product toilet', 'cat-camper', {}, { weight: 1100 }),
  item('mi-camper-handdoeken', 'Handdoeken voor vaat', 'cat-camper', {}, { quantity: 2, weight: 150 }),
  item('mi-camper-toiletpapier', 'Toiletpapier', 'cat-camper', {}, { quantity: 2, weight: 100 }),
  item('mi-camper-keukenpapier', 'Keukenpapier', 'cat-camper', {}, { weight: 100 }),
  item('mi-camper-water', 'Water vullen', 'cat-camper'),
  item('mi-camper-adblue', 'AdBlue check', 'cat-camper'),
  item('mi-camper-hout', 'Hout', 'cat-camper', {}, { weight: 5000 }),
  item('mi-camper-solostove', 'Solo stove', 'cat-camper', {}, { weight: 950 }),
  item('mi-camper-zekeringen', 'Reserve zekeringen / lampjes', 'cat-camper', {}, { weight: 50 }),
  item('mi-camper-vaatwasmiddel', 'Vaatwasmiddel / spullen', 'cat-camper', {}, { weight: 500 }),
  item('mi-camper-gas', 'Gas check', 'cat-camper'),
  item('mi-camper-multitool', 'Multitool of klein gereedschap', 'cat-camper', {}, { weight: 200 }),
  item('mi-camper-brandblusser', 'Brandblusser / blusdeken', 'cat-camper', {}, { weight: 1500 }),
  item('mi-camper-zaklamp', 'Zaklamp of hoofdlamp', 'cat-camper', {}, { weight: 100 }),
  item('mi-camper-levelblokken', 'Levelblokken', 'cat-camper', {}, { weight: 1000 }),
  item('mi-camper-verlengsnoer', 'Verlengsnoer + CEE verloopstekker', 'cat-camper', {}, { weight: 1500 }),
  item('mi-camper-ladder', 'Ladder', 'cat-camper', {}, { weight: 3500 }),
  item('mi-camper-campingcard', 'Camping car-card / ACSI card', 'cat-camper', {}, { weight: 100 }),

  // Kleding & Persoonlijk
  item('mi-cloth-regenjassen', 'Regenjassen', 'cat-clothing', {}, { quantity: 1, perPerson: true, weight: 400 }),
  item('mi-cloth-wandelstokken', 'Wandelstokken', 'cat-clothing', { activities: ['hiking'] }, { weight: 500 }),
  item('mi-cloth-wandelschoenen', 'Wandelschoenen', 'cat-clothing', { activities: ['hiking'] }, { quantity: 1, perPerson: true, weight: 800 }),
  item('mi-cloth-ondergoed', 'Ondergoed en sokken', 'cat-clothing', {}, { quantity: 1, perPerson: true, weight: 300 }),
  item('mi-cloth-earplugs', 'Earplugs', 'cat-clothing', {}, { quantity: 1, perPerson: true, weight: 10 }),
  item('mi-cloth-medicatie', 'Medicatie', 'cat-clothing', {}, { weight: 100 }),
  item('mi-cloth-petten', 'Petten / muts', 'cat-clothing', {}, { quantity: 1, perPerson: true, weight: 100 }),
  item('mi-cloth-quickdrytowels', 'Quick dry towels', 'cat-clothing', {}, { quantity: 1, perPerson: true, weight: 150 }),
  item('mi-cloth-jeans', 'Jeans', 'cat-clothing', {}, { quantity: 1, perPerson: true, weight: 500 }),
  item('mi-cloth-pull', 'Pull / trui', 'cat-clothing', {}, { quantity: 1, perPerson: true, weight: 400 }),
  item('mi-cloth-warmekledij', 'Warme kledij', 'cat-clothing', { weather: ['cold', 'mixed'] }, { quantity: 1, perPerson: true, weight: 600 }),
  item('mi-cloth-toiletzak', 'Toiletzak', 'cat-clothing', {}, { quantity: 1, perPerson: true, weight: 500 }),
  item('mi-cloth-slaapmasker', 'Slaapmasker', 'cat-clothing', {}, { quantity: 1, perPerson: true, weight: 30 }),
  item('mi-cloth-wasmiddel', 'Mini-wasmiddel', 'cat-clothing', {}, { weight: 200 }),
  item('mi-cloth-waslijn', 'Waslijn + wasspelden', 'cat-clothing', {}, { weight: 100 }),
  item('mi-cloth-insectenspray', 'Insectenspray', 'cat-clothing', { weather: ['hot', 'mixed'] }, { weight: 150 }),
  item('mi-cloth-zonnecreme', 'Zonnecrème', 'cat-clothing', { weather: ['hot', 'mixed'] }, { weight: 200 }),
  item('mi-cloth-zonnebril', 'Zonnebril', 'cat-clothing', {}, { quantity: 1, perPerson: true, weight: 50 }),
  item('mi-cloth-waterschoenen', 'Waterschoenen', 'cat-clothing', { activities: ['swimming'] }, { quantity: 1, perPerson: true, weight: 300 }),
  item('mi-cloth-slippers', 'Slippers of sandalen', 'cat-clothing', {}, { quantity: 1, perPerson: true, weight: 400 }),
  item('mi-cloth-lichtekledij', 'Lichte kledij', 'cat-clothing', { weather: ['hot', 'mixed'] }, { quantity: 1, perPerson: true, weight: 300 }),
  item('mi-cloth-zwembroek', 'Zwembroek', 'cat-clothing', { weather: ['hot', 'mixed'], activities: ['swimming'] }, { quantity: 1, perPerson: true, weight: 200 }),
  item('mi-cloth-thermischondergoed', 'Thermisch ondergoed', 'cat-clothing', { weather: ['cold'] }, { quantity: 1, perPerson: true, weight: 300 }),
  item('mi-cloth-handschoenen', 'Handschoenen', 'cat-clothing', { weather: ['cold'] }, { quantity: 1, perPerson: true, weight: 100 }),
  item('mi-cloth-dikkesokken', 'Dikke sokken', 'cat-clothing', { weather: ['cold'] }, { quantity: 1, perPerson: true, weight: 100 }),

  // Ontbijt
  item('mi-bfast-yoghurt', 'Yoghurt', 'cat-food-breakfast', {}, { weight: 500 }),
  item('mi-bfast-chocomelk', 'Chocomelk', 'cat-food-breakfast', {}, { weight: 1050 }),
  item('mi-bfast-brood', 'Sandwich brood', 'cat-food-breakfast', {}, { weight: 400 }),
  item('mi-bfast-melk', 'Houdbare melk of melkpoeder', 'cat-food-breakfast', {}, { weight: 1050 }),
  item('mi-bfast-ham', 'Ham', 'cat-food-breakfast', {}, { weight: 150 }),
  item('mi-bfast-kaas', 'Kaas', 'cat-food-breakfast', {}, { weight: 300 }),
  item('mi-bfast-thee', 'Thee', 'cat-food-breakfast', {}, { weight: 100 }),
  item('mi-bfast-koffie', 'Koffie', 'cat-food-breakfast', {}, { weight: 250 }),
  item('mi-bfast-confituur', 'Confituur', 'cat-food-breakfast', {}, { weight: 350 }),
  item('mi-bfast-granola', 'Granola', 'cat-food-breakfast', {}, { weight: 500 }),
  item('mi-bfast-boter', 'Boter', 'cat-food-breakfast', {}, { weight: 250 }),
  item('mi-bfast-bacon', 'Bacon', 'cat-food-breakfast', {}, { weight: 200 }),
  item('mi-bfast-eieren', 'Eieren', 'cat-food-breakfast', {}, { weight: 350 }),

  // Lunch / Diner
  item('mi-lunch-bbqsaus', 'BBQ saus', 'cat-food-lunch', {}, { weight: 300 }),
  item('mi-lunch-pepersaus', 'Peper saus', 'cat-food-lunch', {}, { weight: 300 }),
  item('mi-lunch-mayo', 'Mayonaise', 'cat-food-lunch', {}, { weight: 400 }),
  item('mi-lunch-olie', 'Olie', 'cat-food-lunch', {}, { weight: 450 }),
  item('mi-lunch-diepvries', 'Diepvries eten (soep, saus)', 'cat-food-lunch', {}, { weight: 800 }),
  item('mi-lunch-wraps', 'Wraps', 'cat-food-lunch', {}, { weight: 250 }),
  item('mi-lunch-blikgroenten', 'Blikgroenten / soep / bonen', 'cat-food-lunch', {}, { weight: 400 }),
  item('mi-lunch-pasta', 'Pasta / rijst', 'cat-food-lunch', {}, { weight: 500 }),
  item('mi-lunch-kruiden', 'Provençaalse kruiden', 'cat-food-lunch', {}, { weight: 50 }),
  item('mi-lunch-sausen', 'Andere sausen', 'cat-food-lunch', {}, { weight: 300 }),

  // Snacks & Apero
  item('mi-snack-chocolade', 'Chocolade', 'cat-food-snacks', {}, { weight: 100 }),
  item('mi-snack-koekjes', 'Koekjes', 'cat-food-snacks', {}, { weight: 200 }),
  item('mi-snack-hapjes', 'Hapjes', 'cat-food-snacks', {}, { weight: 300 }),
  item('mi-snack-olijven', 'Olijven', 'cat-food-snacks', {}, { weight: 200 }),
  item('mi-snack-selderijzout', 'Selderijzout', 'cat-food-snacks', {}, { weight: 100 }),
  item('mi-snack-noten', 'Noten of gedroogd fruit', 'cat-food-snacks', {}, { weight: 200 }),
  item('mi-snack-mosterd', 'Mosterd', 'cat-food-snacks', {}, { weight: 200 }),
  item('mi-snack-chips', 'Chips', 'cat-food-snacks', {}, { weight: 150 }),
  item('mi-snack-ijs', 'IJs / ijscrème', 'cat-food-snacks', {}, { weight: 500 }),

  // Dranken
  item('mi-drink-colazero', 'Cola zero', 'cat-food-drinks', {}, { weight: 1650 }),
  item('mi-drink-ijsblokjes', 'IJsblokjes', 'cat-food-drinks', {}, { weight: 1000 }),
  item('mi-drink-whiskey', 'Whiskey', 'cat-food-drinks', {}, { weight: 1200 }),
  item('mi-drink-rum', 'Rum', 'cat-food-drinks', {}, { weight: 1200 }),
  item('mi-drink-rodewijn', 'Rode wijn', 'cat-food-drinks', {}, { weight: 1300 }),
  item('mi-drink-bier', 'Bier', 'cat-food-drinks', {}, { weight: 2400 }),
  item('mi-drink-champagne', 'Champagne / cava', 'cat-food-drinks', {}, { weight: 1500 }),
  item('mi-drink-baileys', 'Baileys', 'cat-food-drinks', {}, { weight: 1100 }),
  item('mi-drink-cola', 'Cola', 'cat-food-drinks', {}, { weight: 1650 }),
  item('mi-drink-rosewijn', 'Rosé wijn', 'cat-food-drinks', {}, { weight: 1300 }),
  item('mi-drink-wittewijn', 'Witte wijn', 'cat-food-drinks', {}, { weight: 1300 }),
  item('mi-drink-amaretto', 'Amaretto', 'cat-food-drinks', {}, { weight: 1100 }),
  item('mi-drink-water', 'Water', 'cat-food-drinks', {}, { weight: 1500 }),

  // Electronica & Entertainment
  item('mi-elec-waterdichterugzak', 'Waterdichte rugzak', 'cat-electronics', {}, { weight: 800 }),
  item('mi-elec-dagrugzak', 'Kleine dagrugzak', 'cat-electronics', {}, { weight: 500 }),
  item('mi-elec-ereader', 'E-reader', 'cat-electronics', {}, { weight: 170 }),
  item('mi-elec-laptop', 'Laptop', 'cat-electronics', {}, { weight: 1500 }),
  item('mi-elec-hoofdtelefoon', 'Hoofdtelefoon', 'cat-electronics', {}, { weight: 250 }),
  item('mi-elec-kabels', 'Kabels / opladers', 'cat-electronics', {}, { weight: 500 }),
  item('mi-elec-beamer', 'Beamer', 'cat-electronics', {}, { weight: 800 }),
  item('mi-elec-powerbank', 'Powerbank', 'cat-electronics', {}, { weight: 200 }),
  item('mi-elec-boeken', 'Boeken', 'cat-electronics', {}, { weight: 300 }),

  // Buitenleven & Recreatie
  item('mi-out-zijwand', 'Zijwand', 'cat-outdoor', {}, { weight: 3000 }),
  item('mi-out-zonnescherm', 'Zonnescherm', 'cat-outdoor', { weather: ['hot', 'mixed'] }, { weight: 2000 }),
  item('mi-out-reisdocumenten', 'Reisdocumenten (ID, rijbewijs, verzekering)', 'cat-outdoor', {}, { weight: 100 }),
  item('mi-out-fietsen', 'Fietsen', 'cat-outdoor', { activities: ['cycling'] }, { weight: 10000 }),
  item('mi-out-fietsgerief', 'Fietsgerief', 'cat-outdoor', { activities: ['cycling'] }, { weight: 1500 }),
  item('mi-out-petanque', 'Petanque', 'cat-outdoor', { activities: ['relaxation'] }, { weight: 1500 }),
  item('mi-out-kubb', 'Kubb', 'cat-outdoor', { activities: ['relaxation'] }, { weight: 1500 }),
  item('mi-out-camera', 'Camera + statief + tas', 'cat-outdoor', { activities: ['photography'] }, { weight: 3000 }),
  item('mi-out-boodschappentas', 'Opvouwbare boodschappentas', 'cat-outdoor', {}, { weight: 100 }),
  item('mi-out-diepvriestas', 'Diepvriestas', 'cat-outdoor', {}, { weight: 500 }),
  item('mi-out-vislijnen', 'Vislijnen', 'cat-outdoor', { activities: ['fishing'] }, { weight: 200 }),
  item('mi-out-visgerief', 'Visgerief', 'cat-outdoor', { activities: ['fishing'] }, { weight: 1000 }),
  item('mi-out-speelgoed', 'Speelgoed', 'cat-outdoor', { minPeople: 3 }, { weight: 500 }),
  item('mi-out-bbq', 'Grill / BBQ', 'cat-outdoor', {}, { weight: 2000 }),
  item('mi-out-drinkflessen', 'Drinkflessen', 'cat-outdoor', {}, { quantity: 1, perPerson: true, weight: 200 }),

  // Schoonmaak & Hygiëne
  item('mi-clean-handgel', 'Handgel', 'cat-cleaning', {}, { weight: 100 }),
  item('mi-clean-allesreiniger', 'Allesreiniger', 'cat-cleaning', {}, { weight: 550 }),
  item('mi-clean-vuilniszakjes', 'Vuilniszakjes', 'cat-cleaning', {}, { weight: 200 }),
  item('mi-clean-kuisproduct', 'Kuisproduct', 'cat-cleaning', {}, { weight: 500 }),
  item('mi-clean-wetwipes', 'Wet wipes', 'cat-cleaning', {}, { weight: 200 }),
  item('mi-clean-afwasbak', 'Opvouwbare afwasbak of teil', 'cat-cleaning', {}, { weight: 200 }),
  item('mi-clean-afwasborstel', 'Afwasborstel / spons', 'cat-cleaning', {}, { weight: 100 }),

  // Extra (meer dan 2 personen)
  item('mi-extra-isolatie', 'Isolatie voor bovenste bed', 'cat-extra', { minPeople: 3 }, { weight: 500 }),
  item('mi-extra-tafel', 'Extra tafel', 'cat-extra', { minPeople: 3 }, { weight: 3000 }),
  item('mi-extra-stoelen', 'Extra stoelen', 'cat-extra', { minPeople: 3 }, { weight: 1500 }),
  item('mi-extra-kussens', 'Hoofdkussens', 'cat-extra', { minPeople: 3 }, { quantity: 1, perPerson: true, weight: 500 }),
  item('mi-extra-onderlaken', 'Onderlaken', 'cat-extra', { minPeople: 3 }, { quantity: 1, perPerson: true, weight: 400 }),
  item('mi-extra-dekens', 'Dekens / dons / slaapzak', 'cat-extra', { minPeople: 3 }, { quantity: 1, perPerson: true, weight: 1000 }),
  item('mi-extra-tent', 'Tent', 'cat-extra', { minPeople: 3 }, { weight: 2500 }),
  item('mi-extra-matras', 'Matras', 'cat-extra', { minPeople: 3 }, { weight: 1000 }),
  item('mi-extra-pomp', 'Pomp', 'cat-extra', { minPeople: 3 }, { weight: 300 }),
];
