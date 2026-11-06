// Scene data extracted from the Blender file (Kavsar_uyi_ipakchi_blender.blend).
// Coordinates are glTF (Y up) world coordinates; the viewer subtracts CENTER.

export const CENTER = [-220, 0, -7];

// floor slab heights (glTF Y), clip height for the "dollhouse" cut
export const FLOORS = [
  { id: 'all', y: 1.63, clip: null },
  { id: 'f2', y: 5.23, clip: 7.55 },
  { id: 'f1', y: 1.63, clip: 3.95 },
  { id: 'b',  y: -1.77, clip: 0.55 },
];

// camera views from the Blender scene: pos, dir, lens (mm)
export const CAMS = {
  Aerial: { pos: [-196.0, 32.0, 34.0], dir: [-0.418, -0.545, -0.727], lens: 30 },
  Street: { pos: [-219.8, 2.8, 12.5], dir: [0.0, 0.065, -0.998], lens: 20 },
  Courtyard: { pos: [-211.0, 2.9, -15.2], dir: [-0.218, 0.044, 0.975], lens: 16 },
  Tapchan: { pos: [-210.6, 7.4, -4.4], dir: [-0.389, -0.412, 0.824], lens: 18 },
  V_Terrasa: { pos: [-210.4, 7.4, -4.2], dir: [-0.488, -0.375, 0.788], lens: 16 },
  V_Aivan: { pos: [-216.95, 3.3, -5.2], dir: [-0.199, -0.294, -0.935], lens: 15 },
  LowerYard_E: { pos: [-213.8, -0.4, -5.2], dir: [-0.034, 0.0, -0.999], lens: 16 },
  LowerYard_B: { pos: [-227.3, -0.3, -4.0], dir: [0.0, -0.071, -0.997], lens: 16 },
  CHK_suv: { pos: [-219.0, -0.3, -5.6], dir: [0.857, -0.248, -0.451], lens: 20 },
  INT_1F_hall: { pos: [-222.4, 3.2, -3.8], dir: [0.0, -0.037, -0.999], lens: 14 },
  INT_1F_front: { pos: [-218.6, 3.2, -1.5], dir: [0.0, -0.067, 0.998], lens: 14 },
  INT_2F_hall: { pos: [-222.4, 6.8, -3.8], dir: [0.0, -0.037, -0.999], lens: 14 },
  INT_A_mehmonxona: { pos: [-215.2, 3.1, -1.8], dir: [-0.832, -0.232, 0.503], lens: 16 },
  INT_B: { pos: [-225.4, 3.2, -1.5], dir: [-0.65, -0.35, 0.675], lens: 16 },
  INT_C_oshxona: { pos: [-222.8, 3.4, -15.9], dir: [-0.797, -0.345, 0.496], lens: 16 },
  INT_E_yotoq: { pos: [-216.0, 6.7, -12.0], dir: [-0.409, -0.281, -0.868], lens: 16 },
  INT_F_yotoq: { pos: [-225.4, 6.7, -12.0], dir: [-0.469, -0.272, -0.84], lens: 16 },
  INT_stair: { pos: [-223.5, 3.2, -2.8], dir: [-0.979, -0.168, -0.112], lens: 14 },
  INT_Zal: { pos: [-222.4, 3.0, -2.4], dir: [0.0, 0.13, -0.991], lens: 14 },
  INT_basement: { pos: [-222.0, -0.15, -4.0], dir: [0.0, -0.036, 0.999], lens: 14 },
  INT_yertola: { pos: [-222.0, -0.3, -6.5], dir: [0.0, -0.092, 0.996], lens: 14 },
  R_1Q_Ish_xonasi: { pos: [-229.15, 3.33, 2.35], dir: [0.648, -0.34, -0.682], lens: 13 },
  R_1Q_Mehmonxona: { pos: [-222.35, 3.33, 2.35], dir: [0.862, -0.226, -0.454], lens: 13 },
  R_1Q_Ovqatlanish: { pos: [-229.15, 3.33, -12.05], dir: [0.633, -0.332, -0.699], lens: 13 },
  R_1Q_Yotoqxona: { pos: [-219.15, 3.33, -12.45], dir: [0.663, -0.348, -0.663], lens: 13 },
  R_1Q_Zal: { pos: [-224.55, 3.33, -2.45], dir: [0.432, -0.187, -0.882], lens: 13 },
  R_2Q_Oilaviy_xona: { pos: [-226.35, 6.93, 1.75], dir: [0.653, -0.383, -0.653], lens: 13 },
  R_2Q_Terrasa: { pos: [-213.95, 7.63, 2.55], dir: [0.454, -0.367, -0.812], lens: 13 },
  R_2Q_Yotoqxona_1: { pos: [-219.15, 6.93, -12.45], dir: [0.663, -0.348, -0.663], lens: 13 },
  R_Yertola_Dam_olish: { pos: [-228.95, -0.07, 2.35], dir: [0.648, -0.34, -0.682], lens: 13 },
  R_Yertola_Zal: { pos: [-228.9, -0.17, -13.7], dir: [0.997, -0.081, 0.0], lens: 13 },
};

// Rooms: floor, camera key, label
export const ROOMS = [
  { id: 'b_dam', floor: 'b', cam: 'R_Yertola_Dam_olish', name: { uz: "Dam olish zonasi", ru: 'Зона отдыха', en: 'Lounge' } },
  { id: 'b_zal', floor: 'b', cam: 'R_Yertola_Zal', name: { uz: 'Yertola zali', ru: 'Зал цокольного этажа', en: 'Lower hall' } },
  { id: 'b_suv', floor: 'b', cam: 'CHK_suv', name: { uz: 'Suv havzasi', ru: 'Водоём', en: 'Water feature' } },
  { id: 'b_hovli', floor: 'b', cam: 'LowerYard_E', name: { uz: 'Pastki hovli', ru: 'Нижний двор', en: 'Lower courtyard' } },

  { id: 'f1_kirish', floor: 'f1', cam: 'INT_1F_hall', name: { uz: 'Kirish va dahliz', ru: 'Вход и холл', en: 'Entrance hall' } },
  { id: 'f1_mehmon', floor: 'f1', cam: 'R_1Q_Mehmonxona', name: { uz: 'Mehmonxona', ru: 'Гостиная', en: 'Guest room' } },
  { id: 'f1_zal', floor: 'f1', cam: 'R_1Q_Zal', name: { uz: 'Zal', ru: 'Зал', en: 'Hall' } },
  { id: 'f1_ish', floor: 'f1', cam: 'R_1Q_Ish_xonasi', name: { uz: 'Ish xonasi', ru: 'Кабинет', en: 'Study' } },
  { id: 'f1_ovqat', floor: 'f1', cam: 'R_1Q_Ovqatlanish', name: { uz: 'Ovqatlanish xonasi', ru: 'Столовая', en: 'Dining room' } },
  { id: 'f1_oshxona', floor: 'f1', cam: 'INT_C_oshxona', name: { uz: 'Oshxona', ru: 'Кухня', en: 'Kitchen' } },
  { id: 'f1_yotoq', floor: 'f1', cam: 'R_1Q_Yotoqxona', name: { uz: 'Yotoqxona', ru: 'Спальня', en: 'Bedroom' } },
  { id: 'f1_ayvon', floor: 'f1', cam: 'V_Aivan', name: { uz: 'Ayvon', ru: 'Айван', en: 'Aivan (veranda)' } },
  { id: 'f1_hovli', floor: 'f1', cam: 'Courtyard', name: { uz: 'Hovli', ru: 'Двор', en: 'Courtyard' } },

  { id: 'f2_zal', floor: 'f2', cam: 'INT_2F_hall', name: { uz: '2-qavat zali', ru: 'Холл 2 этажа', en: 'Upper hall' } },
  { id: 'f2_oila', floor: 'f2', cam: 'R_2Q_Oilaviy_xona', name: { uz: 'Oilaviy xona', ru: 'Семейная комната', en: 'Family room' } },
  { id: 'f2_yotoq1', floor: 'f2', cam: 'R_2Q_Yotoqxona_1', name: { uz: 'Yotoqxona 1', ru: 'Спальня 1', en: 'Bedroom 1' } },
  { id: 'f2_yotoq2', floor: 'f2', cam: 'INT_E_yotoq', name: { uz: 'Yotoqxona 2', ru: 'Спальня 2', en: 'Bedroom 2' } },
  { id: 'f2_yotoq3', floor: 'f2', cam: 'INT_F_yotoq', name: { uz: 'Yotoqxona 3', ru: 'Спальня 3', en: 'Bedroom 3' } },
  { id: 'f2_terrasa', floor: 'f2', cam: 'V_Terrasa', name: { uz: 'Terrasa', ru: 'Терраса', en: 'Terrace' } },
];

export const VIEWS = [
  { id: 'home', cam: null, name: { uz: 'Umumiy', ru: 'Общий вид', en: 'Overview' }, k: { uz: 'Uy', ru: 'Дом', en: 'House' } },
  { id: 'aerial', cam: 'Aerial', name: { uz: 'Havodan', ru: 'С высоты', en: 'Aerial' }, k: { uz: 'Ko\'rinish', ru: 'Вид', en: 'View' } },
  { id: 'street', cam: 'Street', name: { uz: "Ko'chadan", ru: 'С улицы', en: 'Street' }, k: { uz: 'Fasad', ru: 'Фасад', en: 'Facade' } },
  { id: 'court', cam: 'Courtyard', name: { uz: 'Hovli', ru: 'Двор', en: 'Courtyard' }, k: { uz: 'Tashqari', ru: 'Снаружи', en: 'Outside' } },
  { id: 'terrace', cam: 'Tapchan', name: { uz: 'Terrasa', ru: 'Терраса', en: 'Terrace' }, k: { uz: '2-qavat', ru: '2 этаж', en: 'Level 2' } },
  { id: 'aivan', cam: 'V_Aivan', name: { uz: 'Ayvon', ru: 'Айван', en: 'Aivan' }, k: { uz: '1-qavat', ru: '1 этаж', en: 'Level 1' } },
];

// interior lamp light positions (for evening mode)
export const LAMPS = [
  [-221.73, 4.68, -15.56], [-220.31, 4.68, -15.56], [-220.84, 4.68, -13.9], [-218.9, 4.68, -3.86], [-217.15, 4.68, -3.86],
  [-218.9, 4.68, -2.76], [-217.1, 4.68, -2.76], [-215.2, 4.68, -3.3], [-223.9, 4.68, -0.97], [-228.35, 8.28, 2.07],
  [-228.37, 8.28, 0.42], [-227.8, 8.28, -1.24], [-224.27, 8.28, -15.56], [-222.85, 8.28, -15.56], [-221.73, 8.28, -15.56],
  [-220.31, 8.28, -15.56], [-220.84, 8.28, -13.9], [-223.74, 8.28, -13.9], [-222.4, 7.78, -3.0], [-222.4, 8.28, -12.0],
];

export const I18N = {
  uz: {
    loading: "3D model yuklanmoqda…", preparing: 'Sahna tayyorlanmoqda…',
    tab_overview: 'Umumiy', tab_floors: 'Qavatlar', tab_rooms: 'Xonalar',
    lead: "Uyni barmoq yoki sichqoncha bilan aylantiring. Qavatni tanlab ichini oching yoki xonaga kirib sayr qiling.",
    autorotate: 'Avto-aylanish', plan_view: "Reja ko'rinishi (yuqoridan)",
    floor_hint: "Qavatdagi xona nomiga bosing — ichkariga kirasiz.",
    exit: 'Chiqish',
    walk_hint: "Polga bosing — o'sha joyga borasiz · Suring — atrofga qarang · W A S D — yurish",
    walk_hint_touch: "Polga teging — o'sha joyga borasiz · Suring — atrofga qarang · Joystik — yurish",
    f_all: 'Butun uy', f_all_s: "Tom va fasad bilan", f2: '2-qavat', f2_s: 'Yotoqxonalar, oilaviy xona, terrasa',
    f1: '1-qavat', f1_s: "Mehmonxona, zal, oshxona, ayvon", b: 'Yertola', b_s: 'Dam olish zonasi, pastki hovli',
    day: 'Kunduzi', evening: 'Kechqurun',
  },
  ru: {
    loading: 'Загрузка 3D-модели…', preparing: 'Подготовка сцены…',
    tab_overview: 'Обзор', tab_floors: 'Этажи', tab_rooms: 'Комнаты',
    lead: 'Вращайте дом пальцем или мышью. Выберите этаж, чтобы заглянуть внутрь, или войдите в комнату.',
    autorotate: 'Автовращение', plan_view: 'Вид сверху (план)',
    floor_hint: 'Нажмите на название комнаты, чтобы войти внутрь.',
    exit: 'Выйти',
    walk_hint: 'Нажмите на пол — переход · Тяните — осмотреться · W A S D — ходьба',
    walk_hint_touch: 'Коснитесь пола — переход · Тяните — осмотреться · Джойстик — ходьба',
    f_all: 'Весь дом', f_all_s: 'С крышей и фасадом', f2: '2 этаж', f2_s: 'Спальни, семейная комната, терраса',
    f1: '1 этаж', f1_s: 'Гостиная, зал, кухня, айван', b: 'Цоколь', b_s: 'Зона отдыха, нижний двор',
    day: 'День', evening: 'Вечер',
  },
  en: {
    loading: 'Loading 3D model…', preparing: 'Preparing scene…',
    tab_overview: 'Overview', tab_floors: 'Floors', tab_rooms: 'Rooms',
    lead: 'Orbit the house with your finger or mouse. Pick a floor to look inside, or step into a room.',
    autorotate: 'Auto-rotate', plan_view: 'Plan view (top-down)',
    floor_hint: 'Tap a room label to step inside.',
    exit: 'Exit',
    walk_hint: 'Click the floor to move · Drag to look around · W A S D to walk',
    walk_hint_touch: 'Tap the floor to move · Drag to look around · Joystick to walk',
    f_all: 'Whole house', f_all_s: 'With roof and facade', f2: 'Level 2', f2_s: 'Bedrooms, family room, terrace',
    f1: 'Level 1', f1_s: 'Guest room, hall, kitchen, aivan', b: 'Lower level', b_s: 'Lounge, lower courtyard',
    day: 'Day', evening: 'Evening',
  },
};
