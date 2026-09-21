export const DOGS = Object.freeze([
  { level: 1, name: "Chihuahua", short: "Chihuahua", value: 2, accent: "#c89b68" },
  { level: 2, name: "Yorkshire Terrier", short: "Yorkshire", value: 4, accent: "#9a7250" },
  { level: 3, name: "Jack Russell Terrier", short: "Jack Russell", value: 8, accent: "#cfb894" },
  { level: 4, name: "Teckel", short: "Teckel", value: 16, accent: "#9d5432" },
  { level: 5, name: "Bouledogue français", short: "Bouledogue", value: 32, accent: "#a99382" },
  { level: 6, name: "Cocker Spaniel", short: "Cocker", value: 64, accent: "#ad7047" },
  { level: 7, name: "Beagle", short: "Beagle", value: 128, accent: "#b5844f" },
  { level: 8, name: "Border Collie", short: "Border Collie", value: 256, accent: "#475052" },
  { level: 9, name: "Berger Australien", short: "Berger Australien", value: 512, accent: "#62737b" },
  { level: 10, name: "Boxer", short: "Boxer", value: 1024, accent: "#b96e3e" },
  { level: 11, name: "Husky Sibérien", short: "Husky", value: 2048, accent: "#66828e" },
  { level: 12, name: "Berger Allemand", short: "Berger Allemand", value: 4096, accent: "#8a633d" },
  { level: 13, name: "Golden Retriever", short: "Golden", value: 8192, accent: "#c69a4d" },
  { level: 14, name: "Labrador", short: "Labrador", value: 16384, accent: "#6d5844" },
  { level: 15, name: "Rottweiler", short: "Rottweiler", value: 32768, accent: "#373b38" },
  { level: 16, name: "Dogue de Bordeaux", short: "Dogue de Bordeaux", value: 65536, accent: "#9e5e3e" },
  { level: 17, name: "Terre-Neuve", short: "Terre-Neuve", value: 131072, accent: "#333a3b" },
  { level: 18, name: "Saint-Bernard", short: "Saint-Bernard", value: 262144, accent: "#a16643" },
  { level: 19, name: "Dogue Allemand", short: "Dogue Allemand", value: 524288, accent: "#596064" },
  { level: 20, name: "Mastiff", short: "Mastiff", value: 1048576, accent: "#7f5d43" }
]);

export const dogForLevel = (level) => DOGS[Math.max(1, Math.min(20, level)) - 1];

export function spritePosition(level) {
  const index = Math.max(0, Math.min(19, level - 1));
  const col = index % 5;
  const row = Math.floor(index / 5);
  return `${col * 25}% ${row * (100 / 3)}%`;
}
