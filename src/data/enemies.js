// Rebalanced enemy definitions. Values are tuned to create harder but fair waves.

export const ENEMIES = {
  "grunt": {
    "id": "grunt",
    "name": "Grunt",
    "hp": 62,
    "speed": 57,
    "armor": 1,
    "reward": 5,
    "radius": 10,
    "color": "#fbbf24",
    "threat": 1.18,
    "resist": {}
  },
  "runner": {
    "id": "runner",
    "name": "Runner",
    "hp": 44,
    "speed": 93,
    "armor": 1,
    "reward": 5,
    "radius": 9,
    "color": "#f59e0b",
    "threat": 1.18,
    "resist": {
      "ice": 0.28
    }
  },
  "tank": {
    "id": "tank",
    "name": "Tank",
    "hp": 162,
    "speed": 42,
    "armor": 5,
    "reward": 9,
    "radius": 12,
    "color": "#a3a3a3",
    "threat": 3.54,
    "resist": {
      "physical": 0.11,
      "poison": 0.17
    },
    "slowResist": 0.17
  },
  "ward": {
    "id": "ward",
    "name": "Ward",
    "hp": 98,
    "speed": 55,
    "armor": 2,
    "reward": 8,
    "radius": 11,
    "color": "#60a5fa",
    "threat": 2.36,
    "shield": 25,
    "resist": {
      "fire": 0.39,
      "poison": 0.39
    }
  },
  "splitter": {
    "id": "splitter",
    "name": "Splitter",
    "hp": 90,
    "speed": 49,
    "armor": 2,
    "reward": 8,
    "radius": 11,
    "color": "#f472b6",
    "threat": 2.36,
    "onDeathSpawn": {
      "enemyId": "swarm",
      "count": 2,
      "eliteMult": 1
    },
    "resist": {
      "poison": -0.11
    }
  },
  "swarm": {
    "id": "swarm",
    "name": "Swarm",
    "hp": 31,
    "speed": 83,
    "armor": 1,
    "reward": 2,
    "radius": 8,
    "color": "#fca5a5",
    "threat": 1.18,
    "resist": {
      "fire": -0.16
    }
  },
  "skirmisher": {
    "id": "skirmisher",
    "name": "Skirmisher",
    "hp": 75,
    "speed": 76,
    "armor": 1,
    "reward": 6,
    "radius": 10,
    "color": "#f97316",
    "threat": 1.53,
    "resist": {
      "ice": 0.11
    }
  },
  "brute": {
    "id": "brute",
    "name": "Brute",
    "hp": 251,
    "speed": 36,
    "armor": 3,
    "reward": 12,
    "radius": 13,
    "color": "#b45309",
    "threat": 4.72,
    "resist": {
      "physical": 0.22
    },
    "rage": {
      "hpPct": 0.4,
      "speedMul": 1.4
    }
  },
  "shellback": {
    "id": "shellback",
    "name": "Shellback",
    "hp": 213,
    "speed": 34,
    "armor": 8,
    "reward": 14,
    "radius": 13,
    "color": "#64748b",
    "threat": 4.72,
    "resist": {
      "physical": 0.28
    },
    "slowResist": 0.22
  },
  "mystic": {
    "id": "mystic",
    "name": "Mystic",
    "hp": 123,
    "speed": 55,
    "armor": 2,
    "reward": 9,
    "radius": 11,
    "color": "#8b5cf6",
    "threat": 2.36,
    "resist": {
      "arcane": 0.44,
      "fire": -0.11
    }
  },
  "leech": {
    "id": "leech",
    "name": "Leech",
    "hp": 149,
    "speed": 53,
    "armor": 2,
    "reward": 10,
    "radius": 11,
    "color": "#22c55e",
    "threat": 2.36,
    "regen": 4.4,
    "resist": {
      "poison": 0.28
    }
  },
  "specter": {
    "id": "specter",
    "name": "Specter",
    "hp": 98,
    "speed": 76,
    "armor": 1,
    "reward": 8,
    "radius": 10,
    "color": "#94a3b8",
    "threat": 2.36,
    "resist": {
      "physical": 0.39,
      "fire": -0.22
    }
  },
  "glacier": {
    "id": "glacier",
    "name": "Glacier",
    "hp": 187,
    "speed": 40,
    "armor": 4,
    "reward": 14,
    "radius": 12,
    "color": "#38bdf8",
    "threat": 3.54,
    "slowResist": 0.66,
    "resist": {
      "ice": 0.77
    }
  },
  "phase": {
    "id": "phase",
    "name": "Phase",
    "hp": 104,
    "speed": 68,
    "armor": 1,
    "reward": 8,
    "radius": 10,
    "color": "#c084fc",
    "threat": 2.36,
    "stunResist": 0.95,
    "resist": {
      "arcane": 0.66
    }
  },
  "bombardier": {
    "id": "bombardier",
    "name": "Bombardier",
    "hp": 117,
    "speed": 48,
    "armor": 2,
    "reward": 10,
    "radius": 12,
    "color": "#f87171",
    "threat": 2.36,
    "onDeathSpawn": {
      "enemyId": "swarm",
      "count": 3,
      "eliteMult": 1
    }
  },
  "dreadwing": {
    "id": "dreadwing",
    "name": "Dreadwing",
    "hp": 121,
    "speed": 102,
    "armor": 1,
    "reward": 9,
    "radius": 10,
    "color": "#38bdf8",
    "threat": 2.6,
    "resist": {
      "physical": 0.22,
      "fire": -0.11
    }
  },
  "bulwark": {
    "id": "bulwark",
    "name": "Bulwark",
    "hp": 302,
    "speed": 30,
    "armor": 9,
    "reward": 16,
    "radius": 14,
    "color": "#64748b",
    "threat": 5.31,
    "shield": 69,
    "shieldRegen": 4.4,
    "slowResist": 0.39,
    "resist": {
      "physical": 0.28
    }
  },
  "siphon": {
    "id": "siphon",
    "name": "Siphon",
    "hp": 200,
    "speed": 47,
    "armor": 3,
    "reward": 14,
    "radius": 12,
    "color": "#22c55e",
    "threat": 3.54,
    "regen": 6.6,
    "resist": {
      "poison": 0.44
    }
  },
  "carapace": {
    "id": "carapace",
    "name": "Carapace",
    "hp": 187,
    "speed": 53,
    "armor": 5,
    "reward": 13,
    "radius": 12,
    "color": "#f59e0b",
    "threat": 3.3,
    "slowResist": 0.44,
    "resist": {
      "fire": 0.22
    }
  },
  "wyrm": {
    "id": "wyrm",
    "name": "Wyrm",
    "hp": 232,
    "speed": 59,
    "armor": 2,
    "reward": 15,
    "radius": 13,
    "color": "#f472b6",
    "threat": 4.01,
    "resist": {
      "ice": 0.33,
      "arcane": -0.11
    }
  },
  "riftling": {
    "id": "riftling",
    "name": "Riftling",
    "hp": 82,
    "speed": 98,
    "armor": 1,
    "reward": 7,
    "radius": 9,
    "color": "#22d3ee",
    "threat": 2.1,
    "resist": {
      "arcane": 0.2
    },
    "abilities": [
      {
        "type": "blink",
        "cooldown": 6.8,
        "windup": 0.35,
        "distance": 120,
        "radius": 70,
        "color": "rgba(34,211,238,0.75)",
        "name": "Rift Skip",
        "description": "Teleports forward along the path."
      }
    ]
  },
  "veilwalker": {
    "id": "veilwalker",
    "name": "Veilwalker",
    "hp": 118,
    "speed": 72,
    "armor": 2,
    "reward": 9,
    "radius": 10,
    "color": "#818cf8",
    "threat": 2.6,
    "resist": {
      "physical": 0.18,
      "fire": -0.1
    },
    "abilities": [
      {
        "type": "phase_cloak",
        "cooldown": 9.5,
        "windup": 0.45,
        "duration": 2.2,
        "mitigation": 0.9,
        "radius": 80,
        "color": "rgba(129,140,248,0.8)",
        "name": "Phase Cloak",
        "description": "Briefly becomes near-invulnerable."
      }
    ]
  },
  "nullguard": {
    "id": "nullguard",
    "name": "Nullguard",
    "hp": 180,
    "speed": 44,
    "armor": 5,
    "reward": 12,
    "radius": 12,
    "color": "#67e8f9",
    "threat": 3.6,
    "shield": 45,
    "resist": {
      "arcane": 0.25,
      "ice": 0.1
    },
    "abilities": [
      {
        "type": "shield_surge",
        "cooldown": 11.5,
        "windup": 0.6,
        "radius": 110,
        "shield": 28,
        "selfShield": 45,
        "color": "rgba(103,232,249,0.8)",
        "name": "Null Aegis",
        "description": "Reinforces nearby enemies with shields."
      }
    ]
  },
  "ironweaver": {
    "id": "ironweaver",
    "name": "Ironweaver",
    "hp": 228,
    "speed": 40,
    "armor": 7,
    "reward": 14,
    "radius": 12,
    "color": "#94a3b8",
    "threat": 4.2,
    "resist": {
      "physical": 0.2,
      "fire": 0.1
    },
    "abilities": [
      {
        "type": "armor_boost",
        "cooldown": 12.2,
        "windup": 0.7,
        "radius": 90,
        "armor": 5,
        "duration": 5.2,
        "color": "rgba(148,163,184,0.85)",
        "name": "Ironweave",
        "description": "Grants nearby enemies bonus armor."
      }
    ]
  },
  "chronarch": {
    "id": "chronarch",
    "name": "Chronarch",
    "hp": 152,
    "speed": 60,
    "armor": 2,
    "reward": 12,
    "radius": 11,
    "color": "#facc15",
    "threat": 3.1,
    "resist": {
      "ice": 0.2
    },
    "abilities": [
      {
        "type": "overclock",
        "cooldown": 8.8,
        "windup": 0.4,
        "magnitude": 0.55,
        "duration": 3.6,
        "radius": 70,
        "color": "rgba(250,204,21,0.85)",
        "name": "Time Overclock",
        "description": "Surges its own speed briefly."
      }
    ]
  },
  "abyss_herald": {
    "id": "abyss_herald",
    "name": "Abyss Herald",
    "hp": 176,
    "speed": 48,
    "armor": 3,
    "reward": 13,
    "radius": 12,
    "color": "#7c3aed",
    "threat": 3.4,
    "resist": {
      "arcane": 0.33
    },
    "abilities": [
      {
        "type": "rift_call",
        "cooldown": 11.8,
        "windup": 0.8,
        "count": 2,
        "enemyIds": [
          "riftling",
          "veilwalker"
        ],
        "radius": 90,
        "color": "rgba(124,58,237,0.8)",
        "name": "Rift Call",
        "description": "Summons riftling escorts."
      }
    ]
  },
  "void_sapper": {
    "id": "void_sapper",
    "name": "Void Sapper",
    "hp": 198,
    "speed": 46,
    "armor": 3,
    "reward": 15,
    "radius": 12,
    "color": "#fb7185",
    "threat": 3.8,
    "resist": {
      "poison": 0.28
    },
    "abilities": [
      {
        "type": "life_drain",
        "cooldown": 13.5,
        "windup": 0.7,
        "radius": 120,
        "damage": 2,
        "heal": 90,
        "selfShield": 24,
        "color": "rgba(248,113,113,0.85)",
        "name": "Base Siphon",
        "description": "Drains the base and heals itself."
      }
    ]
  },
  "stasis_reaver": {
    "id": "stasis_reaver",
    "name": "Stasis Reaver",
    "hp": 210,
    "speed": 52,
    "armor": 4,
    "reward": 16,
    "radius": 12,
    "color": "#f0abfc",
    "threat": 4,
    "resist": {
      "arcane": 0.22,
      "fire": -0.1
    },
    "abilities": [
      {
        "type": "stasis_burst",
        "cooldown": 12.8,
        "windup": 0.9,
        "radius": 130,
        "duration": 2,
        "color": "rgba(240,171,252,0.9)",
        "name": "Stasis Burst",
        "description": "Stuns towers in a wide pulse."
      }
    ]
  },
  "golem": {
    "id": "golem",
    "name": "Golem (Boss)",
    "tags": [
      "boss"
    ],
    "hp": 1102,
    "speed": 29,
    "armor": 7,
    "reward": 67,
    "radius": 16,
    "color": "#fb7185",
    "threat": 13.44,
    "slowResist": 0.5,
    "stunResist": 0.83,
    "resist": {
      "fire": 0.17,
      "poison": 0.17,
      "ice": 0.22,
      "physical": 0.06
    },
    "abilities": [
      {
        "type": "summon",
        "cooldown": 8.8,
        "windup": 0.84,
        "count": 3,
        "enemyId": "swarm",
        "radius": 76,
        "color": "rgba(251,113,133,0.75)",
        "description": "Summons a pack of swarmers near the boss."
      },
      {
        "type": "shield_pulse",
        "cooldown": 13.2,
        "windup": 1.16,
        "radius": 105,
        "shield": 21,
        "description": "Grants a shield to nearby enemies."
      }
    ]
  },
  "hydra": {
    "id": "hydra",
    "name": "Hydra (Boss)",
    "tags": [
      "boss"
    ],
    "hp": 890,
    "speed": 31,
    "armor": 5,
    "reward": 78,
    "radius": 17,
    "color": "#34d399",
    "threat": 13.44,
    "resist": {
      "poison": 0.22,
      "fire": 0.11
    },
    "onDeathSpawn": {
      "enemyId": "specter",
      "count": 4,
      "eliteMult": 1
    },
    "abilities": [
      {
        "type": "summon",
        "cooldown": 9.9,
        "windup": 0.95,
        "count": 3,
        "enemyId": "runner",
        "radius": 86,
        "color": "rgba(52,211,153,0.75)",
        "description": "Summons fast runners to overwhelm defenses."
      },
      {
        "type": "heal_pulse",
        "cooldown": 13.2,
        "windup": 1.26,
        "radius": 114,
        "heal": 40,
        "description": "Heals nearby enemies in a green pulse."
      }
    ]
  },
  "colossus": {
    "id": "colossus",
    "name": "Colossus (Boss)",
    "tags": [
      "boss"
    ],
    "hp": 1633,
    "speed": 25,
    "armor": 10,
    "reward": 95,
    "radius": 18,
    "color": "#94a3b8",
    "threat": 16.8,
    "slowResist": 0.55,
    "shield": 92,
    "shieldRegen": 7.7,
    "resist": {
      "physical": 0.17,
      "fire": 0.22
    },
    "abilities": [
      {
        "type": "shield_pulse",
        "cooldown": 12.1,
        "windup": 1.16,
        "radius": 124,
        "shield": 32,
        "name": "Bastion Pulse",
        "description": "Grants heavy shields to nearby enemies."
      },
      {
        "type": "haste_pulse",
        "cooldown": 14.3,
        "windup": 1.26,
        "radius": 133,
        "magnitude": 0.33,
        "duration": 4.4,
        "name": "War Drums",
        "description": "Speeds up enemies in range for a short time."
      },
      {
        "type": "base_strike",
        "cooldown": 17.6,
        "windup": 1.58,
        "radius": 143,
        "damage": 3,
        "name": "Siege Breaker",
        "description": "Directly damages the base."
      }
    ]
  },
  "lich": {
    "id": "lich",
    "name": "Lich (Boss)",
    "tags": [
      "boss"
    ],
    "hp": 807,
    "speed": 35,
    "armor": 3,
    "reward": 90,
    "radius": 16,
    "color": "#a855f7",
    "threat": 13.44,
    "resist": {
      "poison": 0.66,
      "arcane": 0.44
    },
    "onDeathSpawn": {
      "enemyId": "swarm",
      "count": 7,
      "eliteMult": 1
    },
    "abilities": [
      {
        "type": "summon",
        "cooldown": 8.8,
        "windup": 0.95,
        "count": 3,
        "enemyId": "specter",
        "radius": 86,
        "color": "rgba(167,139,250,0.75)",
        "description": "Summons specters to slip past defenses."
      },
      {
        "type": "haste_pulse",
        "cooldown": 13.2,
        "windup": 1.16,
        "radius": 105,
        "magnitude": 0.33,
        "duration": 3.3,
        "description": "Boosts nearby enemies’ speed."
      }
    ]
  },
  "mirror_warden": {
    "id": "mirror_warden",
    "name": "Mirror Warden (Boss)",
    "tags": [
      "boss"
    ],
    "hp": 1928,
    "speed": 27,
    "armor": 8,
    "reward": 134,
    "radius": 19,
    "color": "#a78bfa",
    "threat": 20.16,
    "slowResist": 0.55,
    "stunResist": 0.88,
    "shield": 161,
    "shieldRegen": 9.9,
    "resist": {
      "arcane": 0.33,
      "physical": 0.11
    },
    "abilities": [
      {
        "type": "shield_pulse",
        "cooldown": 12.1,
        "windup": 1.16,
        "radius": 143,
        "shield": 41,
        "name": "Mirror Aegis",
        "description": "Projects mirror shields onto nearby enemies."
      },
      {
        "type": "haste_pulse",
        "cooldown": 14.3,
        "windup": 1.26,
        "radius": 133,
        "magnitude": 0.39,
        "duration": 4.4,
        "name": "Refraction Rush",
        "description": "Hastes nearby enemies with refracted energy."
      },
      {
        "type": "summon",
        "cooldown": 9.9,
        "windup": 1.16,
        "count": 3,
        "enemyIds": [
          "specter",
          "phase",
          "skirmisher"
        ],
        "radius": 105,
        "color": "rgba(167,139,250,0.75)",
        "name": "Mirror Legion",
        "description": "Summons evasive mirror constructs."
      },
      {
        "type": "base_strike",
        "cooldown": 17.6,
        "windup": 1.68,
        "radius": 152,
        "damage": 3,
        "name": "Shatter Rift",
        "description": "Shatters the ground to strike the base."
      }
    ]
  },
  "gravemaw": {
    "id": "gravemaw",
    "name": "Gravemaw (Boss)",
    "tags": [
      "boss"
    ],
    "hp": 2223,
    "speed": 24,
    "armor": 9,
    "reward": 157,
    "radius": 20,
    "color": "#4b5563",
    "threat": 22.4,
    "slowResist": 0.61,
    "stunResist": 0.94,
    "regen": 5.5,
    "resist": {
      "poison": 0.39,
      "fire": 0.11
    },
    "onDeathSpawn": {
      "enemyId": "leech",
      "count": 7,
      "eliteMult": 1
    },
    "abilities": [
      {
        "type": "heal_pulse",
        "cooldown": 13.2,
        "windup": 1.26,
        "radius": 143,
        "heal": 75,
        "name": "Carrion Feast",
        "description": "Restores nearby enemies with necrotic energy."
      },
      {
        "type": "summon",
        "cooldown": 11,
        "windup": 1.26,
        "count": 3,
        "enemyIds": [
          "leech",
          "siphon",
          "carapace"
        ],
        "radius": 114,
        "color": "rgba(107,114,128,0.75)",
        "name": "Grave Swarm",
        "description": "Summons parasitic reinforcements."
      },
      {
        "type": "shield_pulse",
        "cooldown": 15.4,
        "windup": 1.37,
        "radius": 133,
        "shield": 37,
        "name": "Bone Rampart",
        "description": "Raises a bone shield around allies."
      },
      {
        "type": "base_strike",
        "cooldown": 19.8,
        "windup": 1.79,
        "radius": 162,
        "damage": 4,
        "name": "Grave Collapse",
        "description": "Collapses the ground, damaging the base."
      }
    ]
  },
  "oracle": {
    "id": "oracle",
    "name": "Aether Oracle (Boss)",
    "tags": [
      "boss"
    ],
    "hp": 1810,
    "speed": 31,
    "armor": 6,
    "reward": 146,
    "radius": 18,
    "color": "#22d3ee",
    "threat": 19.04,
    "resist": {
      "arcane": 0.28,
      "lightning": 0.22
    },
    "abilities": [
      {
        "type": "haste_pulse",
        "cooldown": 12.1,
        "windup": 1.16,
        "radius": 128,
        "magnitude": 0.35,
        "duration": 4.4,
        "name": "Aether Surge",
        "description": "Pushes enemies forward with temporal haste."
      },
      {
        "type": "summon",
        "cooldown": 9.9,
        "windup": 1.16,
        "count": 3,
        "enemyIds": [
          "mystic",
          "phase",
          "dreadwing"
        ],
        "radius": 105,
        "color": "rgba(34,211,238,0.75)",
        "name": "Astral Echoes",
        "description": "Summons arcane echoes along the path."
      },
      {
        "type": "shield_pulse",
        "cooldown": 14.3,
        "windup": 1.37,
        "radius": 133,
        "shield": 35,
        "name": "Starward Ward",
        "description": "Covers nearby enemies in an aether shield."
      },
      {
        "type": "base_strike",
        "cooldown": 17.6,
        "windup": 1.68,
        "radius": 152,
        "damage": 3,
        "name": "Reality Tear",
        "description": "Rips space to damage the base."
      }
    ]
  },
  "tempest": {
    "id": "tempest",
    "name": "Tempest Regent (Boss)",
    "tags": [
      "boss"
    ],
    "hp": 1397,
    "speed": 33,
    "armor": 6,
    "reward": 106,
    "radius": 17,
    "color": "#38bdf8",
    "threat": 15.68,
    "resist": {
      "lightning": 0.39,
      "ice": 0.11
    },
    "abilities": [
      {
        "type": "summon",
        "cooldown": 9.9,
        "windup": 1.16,
        "count": 3,
        "enemyIds": [
          "skirmisher",
          "bombardier",
          "dreadwing"
        ],
        "radius": 95,
        "color": "rgba(56,189,248,0.75)",
        "name": "Stormgate",
        "description": "Summons storm-touched raiders."
      },
      {
        "type": "haste_pulse",
        "cooldown": 13.2,
        "windup": 1.26,
        "radius": 128,
        "magnitude": 0.39,
        "duration": 4.4,
        "name": "Cyclone Chant",
        "description": "Speeds up nearby enemies."
      },
      {
        "type": "base_strike",
        "cooldown": 17.6,
        "windup": 1.68,
        "radius": 152,
        "damage": 3,
        "name": "Thunderfall",
        "description": "A lightning strike that damages the base."
      }
    ]
  },
  "abyssal": {
    "id": "abyssal",
    "name": "Abyssal Titan (Boss)",
    "tags": [
      "boss"
    ],
    "hp": 2046,
    "speed": 24,
    "armor": 11,
    "reward": 134,
    "radius": 21,
    "color": "#0ea5e9",
    "threat": 20.16,
    "slowResist": 0.61,
    "stunResist": 0.88,
    "shield": 138,
    "shieldRegen": 8.8,
    "resist": {
      "physical": 0.22,
      "poison": 0.22,
      "fire": 0.11
    },
    "abilities": [
      {
        "type": "shield_pulse",
        "cooldown": 12.1,
        "windup": 1.26,
        "radius": 143,
        "shield": 46,
        "name": "Abyssal Bulwark",
        "description": "Grants a massive shield to nearby enemies."
      },
      {
        "type": "heal_pulse",
        "cooldown": 14.3,
        "windup": 1.37,
        "radius": 143,
        "heal": 69,
        "name": "Deep Tide",
        "description": "Heals nearby enemies over a wide area."
      },
      {
        "type": "summon",
        "cooldown": 11,
        "windup": 1.26,
        "count": 2,
        "enemyIds": [
          "bulwark",
          "wyrm",
          "carapace"
        ],
        "radius": 114,
        "color": "rgba(14,165,233,0.75)",
        "name": "Depthspawn",
        "description": "Summons heavy abyssal reinforcements."
      },
      {
        "type": "base_strike",
        "cooldown": 19.8,
        "windup": 1.79,
        "radius": 162,
        "damage": 4,
        "name": "Crushing Wave",
        "description": "Slams the base for heavy damage."
      }
    ]
  },
  "phoenix": {
    "id": "phoenix",
    "name": "Solar Phoenix (Boss)",
    "tags": [
      "boss"
    ],
    "hp": 1633,
    "speed": 37,
    "armor": 5,
    "reward": 123,
    "radius": 18,
    "color": "#facc15",
    "threat": 17.92,
    "resist": {
      "fire": 0.44,
      "ice": -0.11
    },
    "regen": 3.3,
    "abilities": [
      {
        "type": "heal_pulse",
        "cooldown": 13.2,
        "windup": 1.16,
        "radius": 124,
        "heal": 52,
        "name": "Rebirth Flame",
        "description": "Heals nearby enemies with restorative fire."
      },
      {
        "type": "summon",
        "cooldown": 9.9,
        "windup": 1.16,
        "count": 3,
        "enemyIds": [
          "bombardier",
          "wyrm",
          "siphon"
        ],
        "radius": 105,
        "color": "rgba(250,204,21,0.7)",
        "name": "Ember Brood",
        "description": "Summons fiery attackers."
      },
      {
        "type": "base_strike",
        "cooldown": 16.5,
        "windup": 1.58,
        "radius": 143,
        "damage": 3,
        "name": "Solar Crash",
        "description": "Crashes into the base for direct damage."
      }
    ]
  },
  "overlord": {
    "id": "overlord",
    "name": "Overlord (Final Boss)",
    "tags": [
      "boss"
    ],
    "hp": 2164,
    "speed": 27,
    "armor": 8,
    "reward": 123,
    "radius": 20,
    "color": "#f472b6",
    "threat": 20.16,
    "slowResist": 0.61,
    "stunResist": 0.88,
    "shield": 184,
    "shieldRegen": 11,
    "regen": 5.5,
    "resist": {
      "fire": 0.28,
      "poison": 0.28,
      "arcane": 0.22
    },
    "abilities": [
      {
        "type": "summon",
        "cooldown": 7.7,
        "windup": 0.95,
        "count": 3,
        "enemyIds": [
          "dreadwing",
          "bulwark",
          "wyrm"
        ],
        "radius": 105,
        "color": "rgba(251,113,133,0.75)",
        "name": "Rift Legion",
        "description": "Summons elite reinforcements."
      },
      {
        "type": "shield_pulse",
        "cooldown": 11,
        "windup": 1.16,
        "radius": 143,
        "shield": 37,
        "name": "Void Barrier",
        "description": "Grants a powerful shield to nearby enemies."
      },
      {
        "type": "heal_pulse",
        "cooldown": 15.4,
        "windup": 1.47,
        "radius": 143,
        "heal": 63,
        "name": "Dark Renewal",
        "description": "Heals nearby enemies."
      },
      {
        "type": "base_strike",
        "cooldown": 16.5,
        "windup": 1.68,
        "radius": 152,
        "damage": 3,
        "name": "Cataclysm",
        "description": "Smashes the base for direct damage."
      }
    ]
  },
  "harbinger": {
    "id": "harbinger",
    "name": "Harbinger (Final Boss)",
    "tags": [
      "boss"
    ],
    "hp": 2636,
    "speed": 25,
    "armor": 10,
    "reward": 179,
    "radius": 22,
    "color": "#f97316",
    "threat": 24.64,
    "slowResist": 0.66,
    "stunResist": 0.94,
    "shield": 230,
    "shieldRegen": 13.2,
    "regen": 6.6,
    "resist": {
      "fire": 0.33,
      "poison": 0.33,
      "arcane": 0.22,
      "physical": 0.11
    },
    "abilities": [
      {
        "type": "summon",
        "cooldown": 8.8,
        "windup": 1.26,
        "count": 3,
        "enemyIds": [
          "dreadwing",
          "bulwark",
          "wyrm",
          "carapace"
        ],
        "radius": 114,
        "color": "rgba(249,115,22,0.75)",
        "name": "Rift Legion",
        "description": "Summons a brutal strike team."
      },
      {
        "type": "shield_pulse",
        "cooldown": 13.2,
        "windup": 1.26,
        "radius": 152,
        "shield": 44,
        "name": "Iron Aegis",
        "description": "Grants a massive shield to nearby enemies."
      },
      {
        "type": "haste_pulse",
        "cooldown": 14.3,
        "windup": 1.26,
        "radius": 143,
        "magnitude": 0.39,
        "duration": 4.4,
        "name": "Battle Chant",
        "description": "Speeds up nearby enemies."
      },
      {
        "type": "base_strike",
        "cooldown": 15.4,
        "windup": 1.79,
        "radius": 162,
        "damage": 4,
        "name": "Worldbreaker",
        "description": "Crushes the base for massive damage."
      }
    ]
  },
  "void_emperor": {
    "id": "void_emperor",
    "name": "Void Emperor (Final Boss)",
    "tags": [
      "boss"
    ],
    "hp": 1000,
    "speed": 24,
    "armor": 11,
    "reward": 190,
    "radius": 20,
    "color": "#6366f1",
    "threat": 26.4,
    "slowResist": 0.7,
    "stunResist": 0.95,
    "shield": 180,
    "shieldRegen": 12,
    "regen": 5,
    "resist": {
      "arcane": 0.35,
      "fire": 0.22,
      "poison": 0.25,
      "physical": 0.15
    },
    "abilities": [
      {
        "type": "rift_wave",
        "cooldown": 11.5,
        "windup": 1.4,
        "radius": 170,
        "distance": 120,
        "color": "rgba(99,102,241,0.85)",
        "name": "Rift Wave",
        "description": "Surges nearby enemies forward along the path."
      },
      {
        "type": "void_gate",
        "cooldown": 13.2,
        "windup": 1.2,
        "count": 3,
        "enemyIds": [
          "abyss_herald",
          "nullguard",
          "riftling"
        ],
        "radius": 130,
        "color": "rgba(79,70,229,0.85)",
        "name": "Void Gate",
        "description": "Opens a rift that summons reinforcements."
      },
      {
        "type": "oblivion_burst",
        "cooldown": 16.5,
        "windup": 1.6,
        "radius": 170,
        "duration": 2.2,
        "damage": 3,
        "shield": 60,
        "color": "rgba(217,70,239,0.9)",
        "name": "Oblivion Burst",
        "description": "Stuns towers, strikes the base, and grants a shield."
      }
    ],
    "phase2": {
      "triggerPct": 0.2,
      "transitionDuration": 10,
      "healDuringTransition": true,
      "jumpToStart": true,
      "speedMul": 1.18,
      "armorAdd": 3,
      "shieldAdd": 90,
      "shieldRegenAdd": 6,
      "regenAdd": 3,
      "clearEffects": true,
      "abilities": [
        {
          "type": "void_gate",
          "cooldown": 8.6,
          "windup": 1.1,
          "count": 6,
          "enemyIds": [
            "abyss_herald",
            "nullguard",
            "riftling"
          ],
          "radius": 150,
          "color": "rgba(79,70,229,0.9)",
          "name": "Void Gate",
          "description": "Opens massive rifts that summon reinforcements."
        },
        {
          "type": "collapse_pulse",
          "cooldown": 9.2,
          "windup": 1.3,
          "radius": 180,
          "fortify": 0.4,
          "duration": 4.2,
          "color": "rgba(14,165,233,0.9)",
          "name": "Collapse Pulse",
          "description": "Cleanses nearby enemies and grants fortify."
        },
        {
          "type": "starfall",
          "cooldown": 11.2,
          "windup": 1.5,
          "radius": 180,
          "damage": 4,
          "magnitude": 0.45,
          "duration": 4,
          "color": "rgba(251,113,133,0.9)",
          "name": "Starfall",
          "description": "Calls down a crushing surge that hastes allies and damages the base."
        },
        {
          "type": "phase_dash",
          "cooldown": 9.6,
          "windup": 1.1,
          "radius": 150,
          "distance": 150,
          "duration": 1.6,
          "color": "rgba(56,189,248,0.95)",
          "name": "Phase Dash",
          "description": "Teleports forward, stunning towers near its arrival."
        },
        {
          "type": "lane_jump",
          "cooldown": 9.8,
          "windup": 2,
          "radius": 130,
          "minJumpDistance": 90,
          "telegraphRadius": 110,
          "color": "rgba(59,130,246,0.9)",
          "name": "Lane Rift",
          "description": "Shifts to another lane at the same relative point."
        }
      ]
    }
  }
};
