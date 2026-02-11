// Rebalanced tower definitions. Values are intentionally tuned for higher difficulty and stronger role identity.

export const TOWERS = {
  "archer": {
    "id": "archer",
    "name": "Archer",
    "role": "single-target",
    "cost": 62,
    "color": "#e7ecff",
    "stats": {
      "range": 172.5,
      "fireRate": 0.98,
      "damage": 12.2,
      "damageType": "physical",
      "projectileSpeed": 380.8,
      "critChance": 0.068,
      "critMult": 2.05,
      "targeting": "first"
    },
    "upgrades": [
      {
        "id": "archer_rapid_string",
        "tier": 1,
        "name": "Rapid String",
        "cost": 65,
        "description": "Faster firing.",
        "excludes": [
          "archer_deadeye"
        ],
        "effects": {
          "statsMul": {
            "fireRate": 1.298
          }
        }
      },
      {
        "id": "archer_deadeye",
        "tier": 1,
        "name": "Deadeye Scope",
        "cost": 76,
        "description": "Higher damage, Longer range, Higher crit chance.",
        "excludes": [
          "archer_rapid_string"
        ],
        "effects": {
          "statsMul": {
            "damage": 1.255,
            "range": 1.17
          },
          "statsAdd": {
            "critChance": 0.06
          }
        }
      },
      {
        "id": "archer_piercing_tips",
        "tier": 2,
        "name": "Piercing Tips",
        "cost": 98,
        "description": "Shreds armor.",
        "requires": [
          "archer_deadeye"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "armor_reduction",
              "magnitude": 2.7,
              "duration": 3.15,
              "mode": "flat"
            }
          ]
        }
      },
      {
        "id": "archer_barrage",
        "tier": 2,
        "name": "Barrage",
        "cost": 92,
        "description": "Lower damage, Faster firing.",
        "requires": [
          "archer_rapid_string"
        ],
        "effects": {
          "statsMul": {
            "fireRate": 1.213,
            "damage": 0.915
          }
        }
      },
      {
        "id": "archer_stunning_shot",
        "tier": 3,
        "name": "Stunning Shot",
        "cost": 140,
        "description": "Can stun.",
        "requires": [
          "archer_piercing_tips"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "stun",
              "magnitude": 1,
              "duration": 0.35
            }
          ]
        }
      },
      {
        "id": "archer_marks",
        "tier": 3,
        "name": "Marked Targets",
        "cost": 150,
        "description": "Exposes targets.",
        "requires": [
          "archer_barrage"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "vulnerability",
              "magnitude": 0.15,
              "duration": 3.08
            }
          ]
        }
      }
    ]
  },
  "cannon": {
    "id": "cannon",
    "name": "Cannon",
    "role": "splash",
    "cost": 85,
    "color": "#a3a3a3",
    "stats": {
      "range": 123.5,
      "fireRate": 0.59,
      "damage": 17.92,
      "damageType": "physical",
      "projectileSpeed": 228,
      "splashRadius": 58.88,
      "targeting": "first"
    },
    "upgrades": [
      {
        "id": "cannon_frag",
        "tier": 1,
        "name": "Fragmentation",
        "cost": 82,
        "description": "Larger splash.",
        "excludes": [
          "cannon_mortar"
        ],
        "effects": {
          "statsMul": {
            "splashRadius": 1.255
          }
        }
      },
      {
        "id": "cannon_mortar",
        "tier": 1,
        "name": "Mortar Barrel",
        "cost": 98,
        "description": "Higher damage, Slower firing, Longer range.",
        "excludes": [
          "cannon_frag"
        ],
        "effects": {
          "statsMul": {
            "range": 1.213,
            "damage": 1.213,
            "fireRate": 0.873
          }
        }
      },
      {
        "id": "cannon_incendiary",
        "tier": 2,
        "name": "Incendiary Shells",
        "cost": 113,
        "description": "Applies burn.",
        "requires": [
          "cannon_frag"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "burn",
              "magnitude": 1.8,
              "duration": 3.3,
              "tickEvery": 0.5,
              "damageType": "fire"
            }
          ]
        }
      },
      {
        "id": "cannon_concussive",
        "tier": 2,
        "name": "Concussive Blast",
        "cost": 129,
        "description": "Can stun.",
        "requires": [
          "cannon_mortar"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "stun",
              "magnitude": 1,
              "duration": 0.25
            }
          ]
        }
      },
      {
        "id": "cannon_devastator",
        "tier": 3,
        "name": "Devastator Shells",
        "cost": 178,
        "description": "Higher damage, Larger splash.",
        "requires": [
          "cannon_incendiary"
        ],
        "effects": {
          "statsMul": {
            "splashRadius": 1.213,
            "damage": 1.213
          }
        }
      },
      {
        "id": "cannon_siege",
        "tier": 3,
        "name": "Siege Charge",
        "cost": 189,
        "description": "Larger splash, Shreds armor.",
        "requires": [
          "cannon_concussive"
        ],
        "effects": {
          "statsMul": {
            "splashRadius": 1.17
          },
          "addOnHitEffects": [
            {
              "type": "armor_reduction",
              "magnitude": 3.6,
              "duration": 3.15,
              "mode": "flat"
            }
          ]
        }
      }
    ]
  },
  "frost": {
    "id": "frost",
    "name": "Frost Spire",
    "role": "slowing",
    "cost": 73,
    "color": "#60a5fa",
    "stats": {
      "range": 125,
      "fireRate": 0.84,
      "damage": 4.92,
      "damageType": "ice",
      "projectileSpeed": 260,
      "targeting": "first",
      "onHitEffects": [
        {
          "type": "slow",
          "magnitude": 0.39,
          "duration": 1.87
        }
      ]
    },
    "upgrades": [
      {
        "id": "frost_hail",
        "tier": 1,
        "name": "Hail Shards",
        "cost": 92,
        "description": "Larger splash.",
        "excludes": [
          "frost_deep_freeze"
        ],
        "effects": {
          "statsAdd": {
            "splashRadius": 28.8
          }
        }
      },
      {
        "id": "frost_deep_freeze",
        "tier": 1,
        "name": "Deep Freeze",
        "cost": 107,
        "description": "Applies slow.",
        "excludes": [
          "frost_hail"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "slow",
              "magnitude": 0.2,
              "duration": 2.72
            }
          ]
        }
      },
      {
        "id": "frost_shatter",
        "tier": 2,
        "name": "Shatter",
        "cost": 140,
        "description": "Shreds armor.",
        "requires": [
          "frost_deep_freeze"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "armor_reduction",
              "magnitude": 0.2,
              "duration": 1.98,
              "mode": "percent"
            }
          ]
        }
      },
      {
        "id": "frost_glacial",
        "tier": 2,
        "name": "Glacial Core",
        "cost": 140,
        "description": "Faster firing, Longer range.",
        "requires": [
          "frost_hail"
        ],
        "effects": {
          "statsMul": {
            "range": 1.17,
            "fireRate": 1.128
          }
        }
      },
      {
        "id": "frost_cryostasis",
        "tier": 3,
        "name": "Cryostasis",
        "cost": 178,
        "description": "Can stun.",
        "requires": [
          "frost_shatter"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "stun",
              "magnitude": 1,
              "duration": 0.32
            }
          ]
        }
      }
    ]
  },
  "alchemist": {
    "id": "alchemist",
    "name": "Alchemist",
    "role": "debuff",
    "cost": 86,
    "color": "#34d399",
    "stats": {
      "range": 147,
      "fireRate": 0.71,
      "damage": 3,
      "damageType": "arcane",
      "projectileSpeed": 273,
      "targeting": "strongest",
      "onHitEffects": [
        {
          "type": "armor_reduction",
          "magnitude": 2.7,
          "duration": 3.15,
          "mode": "flat"
        },
        {
          "type": "poison",
          "magnitude": 1.8,
          "duration": 3.85,
          "tickEvery": 0.5,
          "damageType": "poison"
        }
      ]
    },
    "upgrades": [
      {
        "id": "alc_corrosion",
        "tier": 1,
        "name": "Corrosion",
        "cost": 113,
        "description": "Shreds armor.",
        "excludes": [
          "alc_toxicology"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "armor_reduction",
              "magnitude": 0.25,
              "duration": 2.7,
              "mode": "percent"
            }
          ]
        }
      },
      {
        "id": "alc_toxicology",
        "tier": 1,
        "name": "Toxicology",
        "cost": 107,
        "description": "Applies poison.",
        "excludes": [
          "alc_corrosion"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "poison",
              "magnitude": 1.08,
              "duration": 3.85,
              "tickEvery": 0.5,
              "damageType": "poison"
            }
          ]
        }
      },
      {
        "id": "alc_spill",
        "tier": 2,
        "name": "Volatile Spill",
        "cost": 140,
        "description": "Larger splash.",
        "requires": [
          "alc_toxicology"
        ],
        "effects": {
          "statsAdd": {
            "splashRadius": 24
          }
        }
      },
      {
        "id": "alc_brittle",
        "tier": 2,
        "name": "Brittle Mixture",
        "cost": 150,
        "description": "Longer range, Shreds armor.",
        "requires": [
          "alc_corrosion"
        ],
        "effects": {
          "statsMul": {
            "range": 1.213
          },
          "addOnHitEffects": [
            {
              "type": "armor_reduction",
              "magnitude": 0.16,
              "duration": 2.7,
              "mode": "percent"
            }
          ]
        }
      },
      {
        "id": "alc_catalyst",
        "tier": 3,
        "name": "Catalyst",
        "cost": 189,
        "description": "Exposes targets.",
        "requires": [
          "alc_spill"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "vulnerability",
              "magnitude": 0.17,
              "duration": 3.3
            }
          ]
        }
      }
    ]
  },
  "banner": {
    "id": "banner",
    "name": "Banner",
    "role": "support",
    "cost": 121,
    "color": "#a78bfa",
    "stats": {
      "aura": {
        "radius": 138,
        "buffs": {
          "damageMul": 1.134
        }
      }
    },
    "upgrades": [
      {
        "id": "banner_drums",
        "tier": 1,
        "name": "War Drums",
        "cost": 107,
        "description": "Stronger aura.",
        "excludes": [
          "banner_sharpen"
        ],
        "effects": {
          "auraAdd": {
            "buffs": {
              "fireRateMul": 1.108
            }
          }
        }
      },
      {
        "id": "banner_sharpen",
        "tier": 1,
        "name": "Sharpening",
        "cost": 113,
        "description": "Stronger aura.",
        "excludes": [
          "banner_drums"
        ],
        "effects": {
          "auraAdd": {
            "buffs": {
              "damageMul": 1.162
            }
          }
        }
      },
      {
        "id": "banner_command",
        "tier": 2,
        "name": "Command",
        "cost": 167,
        "description": "Stronger aura.",
        "requires": [
          "banner_drums"
        ],
        "effects": {
          "auraAdd": {
            "radius": 153,
            "buffs": {
              "rangeMul": 1.072
            }
          }
        }
      },
      {
        "id": "banner_battle_cry",
        "tier": 2,
        "name": "Battle Cry",
        "cost": 178,
        "description": "Stronger aura.",
        "requires": [
          "banner_sharpen"
        ],
        "effects": {
          "auraAdd": {
            "radius": 153,
            "buffs": {
              "damageMul": 1.216
            }
          }
        }
      },
      {
        "id": "banner_tactician",
        "tier": 3,
        "name": "Tactician",
        "cost": 200,
        "description": "Stronger aura.",
        "requires": [
          "banner_battle_cry"
        ],
        "effects": {
          "auraAdd": {
            "buffs": {
              "projectileSpeedMul": 1.18,
              "rangeMul": 1.09
            }
          }
        }
      }
    ]
  },
  "medic": {
    "id": "medic",
    "name": "Field Medic",
    "role": "support",
    "cost": 150,
    "color": "#34d399",
    "stats": {
      "aura": {
        "radius": 138,
        "buffs": {
          "stunImmune": true,
          "cleanseStun": true
        }
      },
      "ability": {
        "name": "Field Triage",
        "type": "base_heal",
        "cooldown": 14.4,
        "lives": 1,
        "radius": 133,
        "color": "rgba(52,211,153,0.7)",
        "description": "Restores 1 base life and clears tower stuns nearby."
      }
    },
    "upgrades": [
      {
        "id": "medic_response",
        "tier": 1,
        "name": "Rapid Response",
        "cost": 129,
        "description": "Improves ability.",
        "excludes": [
          "medic_coverage"
        ],
        "effects": {
          "abilityMul": {
            "cooldown": 0.873
          }
        }
      },
      {
        "id": "medic_coverage",
        "tier": 1,
        "name": "Wide Coverage",
        "cost": 129,
        "description": "Stronger aura.",
        "excludes": [
          "medic_response"
        ],
        "effects": {
          "auraAdd": {
            "radius": 153
          }
        }
      },
      {
        "id": "medic_kits",
        "tier": 2,
        "name": "Emergency Kits",
        "cost": 178,
        "description": "Improves ability.",
        "requires": [
          "medic_response"
        ],
        "effects": {
          "abilityAdd": {
            "lives": 0.85
          }
        }
      },
      {
        "id": "medic_sanctuary",
        "tier": 2,
        "name": "Sanctuary",
        "cost": 178,
        "description": "Stronger aura.",
        "requires": [
          "medic_coverage"
        ],
        "effects": {
          "auraAdd": {
            "radius": 178.5
          }
        }
      },
      {
        "id": "medic_rescue",
        "tier": 3,
        "name": "Rescue Line",
        "cost": 221,
        "description": "Improves ability.",
        "requires": [
          "medic_kits"
        ],
        "effects": {
          "abilityMul": {
            "cooldown": 0.788
          },
          "abilityAdd": {
            "lives": 0.85
          }
        }
      },
      {
        "id": "medic_halo",
        "tier": 3,
        "name": "Guardian Halo",
        "cost": 221,
        "description": "Stronger aura.",
        "requires": [
          "medic_sanctuary"
        ],
        "effects": {
          "auraAdd": {
            "radius": 212.5
          }
        }
      }
    ]
  },
  "sniper": {
    "id": "sniper",
    "name": "Sniper",
    "role": "single-target",
    "cost": 117,
    "color": "#cbd5f5",
    "stats": {
      "range": 303.6,
      "fireRate": 0.35,
      "damage": 50.75,
      "damageType": "physical",
      "projectileSpeed": 470.4,
      "critChance": 0.136,
      "critMult": 2.42,
      "targeting": "strongest"
    },
    "upgrades": [
      {
        "id": "sniper_stable_scope",
        "tier": 1,
        "name": "Stable Scope",
        "cost": 98,
        "description": "Longer range, Higher crit chance.",
        "excludes": [
          "sniper_caliber"
        ],
        "effects": {
          "statsMul": {
            "range": 1.213
          },
          "statsAdd": {
            "critChance": 0.08
          }
        }
      },
      {
        "id": "sniper_caliber",
        "tier": 1,
        "name": "Caliber Rounds",
        "cost": 107,
        "description": "Higher damage, Shreds armor.",
        "excludes": [
          "sniper_stable_scope"
        ],
        "effects": {
          "statsMul": {
            "damage": 1.34
          },
          "addOnHitEffects": [
            {
              "type": "armor_reduction",
              "magnitude": 3.6,
              "duration": 3.15,
              "mode": "flat"
            }
          ]
        }
      },
      {
        "id": "sniper_executioner",
        "tier": 2,
        "name": "Executioner",
        "cost": 167,
        "description": "Bonus damage.",
        "requires": [
          "sniper_caliber"
        ],
        "effects": {
          "addBonusTags": [
            "elite",
            "boss"
          ],
          "bonusMultAdd": 0.51
        }
      },
      {
        "id": "sniper_silencer",
        "tier": 2,
        "name": "Silencer",
        "cost": 150,
        "description": "Lower damage, Faster firing, Targeting: weakest.",
        "requires": [
          "sniper_stable_scope"
        ],
        "effects": {
          "statsMul": {
            "fireRate": 1.213,
            "damage": 0.915
          },
          "setTargeting": "weakest"
        }
      },
      {
        "id": "sniper_mark",
        "tier": 3,
        "name": "Marked Shot",
        "cost": 200,
        "description": "Exposes targets.",
        "requires": [
          "sniper_executioner"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "vulnerability",
              "magnitude": 0.17,
              "duration": 3.52
            }
          ]
        }
      },
      {
        "id": "sniper_dead_stop",
        "tier": 3,
        "name": "Dead Stop",
        "cost": 189,
        "description": "Can stun.",
        "requires": [
          "sniper_silencer"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "stun",
              "magnitude": 1,
              "duration": 0.32
            }
          ]
        }
      }
    ]
  },
  "minigunner": {
    "id": "minigunner",
    "name": "Minigunner",
    "role": "dps",
    "cost": 146,
    "color": "#f59e0b",
    "stats": {
      "range": 102.6,
      "fireRate": 8.07,
      "damage": 2.3,
      "damageType": "physical",
      "projectileSpeed": 320,
      "critChance": 0.026,
      "critMult": 1.67,
      "targeting": "first"
    },
    "upgrades": [
      {
        "id": "minigunner_rotary",
        "tier": 1,
        "name": "Rotary Barrel",
        "cost": 113,
        "description": "Faster firing.",
        "excludes": [
          "minigunner_shredder"
        ],
        "effects": {
          "statsAdd": {
            "fireRate": 1.6
          }
        }
      },
      {
        "id": "minigunner_shredder",
        "tier": 1,
        "name": "Shredder Rounds",
        "cost": 118,
        "description": "Shreds armor.",
        "excludes": [
          "minigunner_rotary"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "armor_reduction",
              "magnitude": 2.25,
              "duration": 2.25,
              "mode": "flat"
            }
          ]
        }
      },
      {
        "id": "minigunner_mount",
        "tier": 2,
        "name": "Stabilized Mount",
        "cost": 140,
        "description": "Faster firing, Longer range.",
        "requires": [
          "minigunner_rotary"
        ],
        "effects": {
          "statsAdd": {
            "range": 16,
            "fireRate": 0.8
          }
        }
      },
      {
        "id": "minigunner_tracer",
        "tier": 2,
        "name": "Tracer Belts",
        "cost": 134,
        "description": "Higher crit chance.",
        "requires": [
          "minigunner_shredder"
        ],
        "effects": {
          "statsAdd": {
            "critChance": 0.06
          }
        }
      },
      {
        "id": "minigunner_storm",
        "tier": 3,
        "name": "Bullet Storm",
        "cost": 183,
        "description": "Higher damage, Faster firing.",
        "requires": [
          "minigunner_mount"
        ],
        "effects": {
          "statsMul": {
            "fireRate": 1.298
          },
          "statsAdd": {
            "damage": 0.8
          }
        }
      },
      {
        "id": "minigunner_melter",
        "tier": 3,
        "name": "Armor Melter",
        "cost": 194,
        "description": "Shreds armor, Exposes targets.",
        "requires": [
          "minigunner_tracer"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "armor_reduction",
              "magnitude": 3.15,
              "duration": 2.7,
              "mode": "flat"
            },
            {
              "type": "vulnerability",
              "magnitude": 0.13,
              "duration": 2.75
            }
          ]
        }
      }
    ]
  },
  "tesla": {
    "id": "tesla",
    "name": "Tesla Coil",
    "role": "splash",
    "cost": 107,
    "color": "#7dd3fc",
    "stats": {
      "range": 147.25,
      "fireRate": 0.86,
      "damage": 10.08,
      "damageType": "arcane",
      "projectileSpeed": 285,
      "targeting": "closest",
      "chain": {
        "maxJumps": 2,
        "range": 72,
        "falloff": 0.67
      }
    },
    "upgrades": [
      {
        "id": "tesla_overcharge",
        "tier": 1,
        "name": "Overcharge Coils",
        "cost": 92,
        "description": "Higher damage.",
        "excludes": [
          "tesla_forked"
        ],
        "effects": {
          "statsMul": {
            "damage": 1.255
          }
        }
      },
      {
        "id": "tesla_forked",
        "tier": 1,
        "name": "Forked Arc",
        "cost": 98,
        "description": "Rebalanced upgrade.",
        "excludes": [
          "tesla_overcharge"
        ],
        "effects": {
          "chainAdd": {
            "maxJumps": 1
          }
        }
      },
      {
        "id": "tesla_superconduct",
        "tier": 2,
        "name": "Superconductors",
        "cost": 140,
        "description": "Faster firing.",
        "requires": [
          "tesla_overcharge"
        ],
        "effects": {
          "chainMul": {
            "range": 1.17
          },
          "statsMul": {
            "fireRate": 1.102
          }
        }
      },
      {
        "id": "tesla_static",
        "tier": 2,
        "name": "Static Field",
        "cost": 140,
        "description": "Can stun.",
        "requires": [
          "tesla_forked"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "stun",
              "magnitude": 1,
              "duration": 0.25
            }
          ]
        }
      },
      {
        "id": "tesla_storm",
        "tier": 3,
        "name": "Storm Surge",
        "cost": 178,
        "description": "Applies slow.",
        "requires": [
          "tesla_superconduct"
        ],
        "effects": {
          "chainAdd": {
            "maxJumps": 1
          },
          "addOnHitEffects": [
            {
              "type": "slow",
              "magnitude": 0.22,
              "duration": 1.19
            }
          ]
        }
      },
      {
        "id": "tesla_arcstorm",
        "tier": 3,
        "name": "Arcstorm",
        "cost": 183,
        "description": "Higher damage.",
        "requires": [
          "tesla_static"
        ],
        "effects": {
          "statsMul": {
            "damage": 1.17
          },
          "chainMul": {
            "falloff": 1.128
          }
        }
      }
    ]
  },
  "mortar": {
    "id": "mortar",
    "name": "Mortar",
    "role": "splash",
    "cost": 128,
    "color": "#fbbf24",
    "stats": {
      "range": 251.27,
      "fireRate": 0.26,
      "damage": 34.94,
      "damageType": "physical",
      "projectileSpeed": 209,
      "splashRadius": 89.6,
      "targeting": "first"
    },
    "upgrades": [
      {
        "id": "mortar_high_explosive",
        "tier": 1,
        "name": "High Explosive",
        "cost": 113,
        "description": "Higher damage, Larger splash.",
        "excludes": [
          "mortar_airburst"
        ],
        "effects": {
          "statsMul": {
            "splashRadius": 1.213,
            "damage": 1.17
          }
        }
      },
      {
        "id": "mortar_airburst",
        "tier": 1,
        "name": "Airburst",
        "cost": 107,
        "description": "Faster firing, Larger splash.",
        "excludes": [
          "mortar_high_explosive"
        ],
        "effects": {
          "statsMul": {
            "fireRate": 1.255,
            "splashRadius": 0.873
          }
        }
      },
      {
        "id": "mortar_cluster",
        "tier": 2,
        "name": "Cluster Rounds",
        "cost": 150,
        "description": "Applies burn.",
        "requires": [
          "mortar_high_explosive"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "burn",
              "magnitude": 2.25,
              "duration": 3.52,
              "tickEvery": 0.5,
              "damageType": "fire"
            }
          ]
        }
      },
      {
        "id": "mortar_seismic",
        "tier": 2,
        "name": "Seismic Shells",
        "cost": 150,
        "description": "Can stun, Shreds armor.",
        "requires": [
          "mortar_airburst"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "stun",
              "magnitude": 1,
              "duration": 0.25
            },
            {
              "type": "armor_reduction",
              "magnitude": 2.7,
              "duration": 2.7,
              "mode": "flat"
            }
          ]
        }
      },
      {
        "id": "mortar_inferno",
        "tier": 3,
        "name": "Inferno Blast",
        "cost": 200,
        "description": "Larger splash, Applies burn.",
        "requires": [
          "mortar_cluster"
        ],
        "effects": {
          "statsMul": {
            "splashRadius": 1.128
          },
          "addOnHitEffects": [
            {
              "type": "burn",
              "magnitude": 1.44,
              "duration": 3.85,
              "tickEvery": 0.4,
              "damageType": "fire"
            }
          ]
        }
      },
      {
        "id": "mortar_quake",
        "tier": 3,
        "name": "Quake Rounds",
        "cost": 205,
        "description": "Higher damage, Larger splash.",
        "requires": [
          "mortar_seismic"
        ],
        "effects": {
          "statsMul": {
            "splashRadius": 1.17,
            "damage": 1.128
          }
        }
      }
    ]
  },
  "flame": {
    "id": "flame",
    "name": "Flamethrower",
    "role": "splash",
    "cost": 95,
    "color": "#fb923c",
    "stats": {
      "range": 76.95,
      "fireRate": 2.62,
      "damage": 4.48,
      "damageType": "fire",
      "projectileSpeed": 199.5,
      "splashRadius": 27.65,
      "targeting": "closest",
      "onHitEffects": [
        {
          "type": "burn",
          "magnitude": 1.62,
          "duration": 2.42,
          "tickEvery": 0.4,
          "damageType": "fire"
        }
      ]
    },
    "upgrades": [
      {
        "id": "flame_napalm",
        "tier": 1,
        "name": "Napalm Gel",
        "cost": 92,
        "description": "Applies burn.",
        "excludes": [
          "flame_wide_nozzle"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "burn",
              "magnitude": 1.08,
              "duration": 1.76,
              "tickEvery": 0.5,
              "damageType": "fire"
            }
          ]
        }
      },
      {
        "id": "flame_wide_nozzle",
        "tier": 1,
        "name": "Wide Nozzle",
        "cost": 87,
        "description": "Longer range, Larger splash.",
        "excludes": [
          "flame_napalm"
        ],
        "effects": {
          "statsMul": {
            "range": 1.17,
            "splashRadius": 1.255
          }
        }
      },
      {
        "id": "flame_pressure",
        "tier": 2,
        "name": "Pressure Feed",
        "cost": 134,
        "description": "Faster firing.",
        "requires": [
          "flame_napalm"
        ],
        "effects": {
          "statsMul": {
            "fireRate": 1.213
          }
        }
      },
      {
        "id": "flame_flash",
        "tier": 2,
        "name": "Thermal Shock",
        "cost": 129,
        "description": "Can stun.",
        "requires": [
          "flame_wide_nozzle"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "stun",
              "magnitude": 1,
              "duration": 0.18
            }
          ]
        }
      },
      {
        "id": "flame_wildfire",
        "tier": 3,
        "name": "Wildfire",
        "cost": 178,
        "description": "Exposes targets.",
        "requires": [
          "flame_pressure"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "vulnerability",
              "magnitude": 0.13,
              "duration": 2.75
            }
          ]
        }
      },
      {
        "id": "flame_smoke",
        "tier": 3,
        "name": "Smoke Veil",
        "cost": 173,
        "description": "Applies slow.",
        "requires": [
          "flame_flash"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "slow",
              "magnitude": 0.22,
              "duration": 1.19
            }
          ]
        }
      }
    ]
  },
  "hex": {
    "id": "hex",
    "name": "Hex",
    "role": "debuff",
    "cost": 102,
    "color": "#a855f7",
    "stats": {
      "range": 157.5,
      "fireRate": 0.71,
      "damage": 4.5,
      "damageType": "arcane",
      "projectileSpeed": 262.5,
      "targeting": "strongest",
      "onHitEffects": [
        {
          "type": "vulnerability",
          "magnitude": 0.17,
          "duration": 3.3
        }
      ]
    },
    "upgrades": [
      {
        "id": "hex_malediction",
        "tier": 1,
        "name": "Malediction",
        "cost": 98,
        "description": "Exposes targets.",
        "excludes": [
          "hex_mire"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "vulnerability",
              "magnitude": 0.09,
              "duration": 1.98
            }
          ]
        }
      },
      {
        "id": "hex_mire",
        "tier": 1,
        "name": "Haunting Mire",
        "cost": 92,
        "description": "Applies slow.",
        "excludes": [
          "hex_malediction"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "slow",
              "magnitude": 0.28,
              "duration": 1.87
            }
          ]
        }
      },
      {
        "id": "hex_reverb",
        "tier": 2,
        "name": "Resonant Curse",
        "cost": 140,
        "description": "Larger splash.",
        "requires": [
          "hex_malediction"
        ],
        "effects": {
          "statsAdd": {
            "splashRadius": 22.4
          }
        }
      },
      {
        "id": "hex_twist",
        "tier": 2,
        "name": "Twisted Sigil",
        "cost": 140,
        "description": "Shreds armor.",
        "requires": [
          "hex_mire"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "armor_reduction",
              "magnitude": 0.18,
              "duration": 2.7,
              "mode": "percent"
            }
          ]
        }
      },
      {
        "id": "hex_omen",
        "tier": 3,
        "name": "Omen",
        "cost": 183,
        "description": "Bonus damage.",
        "requires": [
          "hex_reverb"
        ],
        "effects": {
          "addBonusTags": [
            "elite",
            "boss"
          ],
          "bonusMultAdd": 0.3
        }
      },
      {
        "id": "hex_eruption",
        "tier": 3,
        "name": "Hex Eruption",
        "cost": 178,
        "description": "Applies burn.",
        "requires": [
          "hex_twist"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "burn",
              "magnitude": 1.62,
              "duration": 2.86,
              "tickEvery": 0.5,
              "damageType": "fire"
            }
          ]
        }
      }
    ]
  },
  "overseer": {
    "id": "overseer",
    "name": "Overseer",
    "role": "support",
    "cost": 133,
    "color": "#22d3ee",
    "stats": {
      "aura": {
        "radius": 147.2,
        "buffs": {
          "rangeMul": 1.112,
          "projectileSpeedMul": 1.168
        }
      }
    },
    "upgrades": [
      {
        "id": "overseer_signal",
        "tier": 1,
        "name": "Signal Boost",
        "cost": 107,
        "description": "Stronger aura.",
        "excludes": [
          "overseer_drill"
        ],
        "effects": {
          "auraAdd": {
            "radius": 161.5
          }
        }
      },
      {
        "id": "overseer_drill",
        "tier": 1,
        "name": "Drill Orders",
        "cost": 113,
        "description": "Stronger aura.",
        "excludes": [
          "overseer_signal"
        ],
        "effects": {
          "auraAdd": {
            "buffs": {
              "fireRateMul": 1.09
            }
          }
        }
      },
      {
        "id": "overseer_focus",
        "tier": 2,
        "name": "Focus Protocol",
        "cost": 150,
        "description": "Stronger aura.",
        "requires": [
          "overseer_signal"
        ],
        "effects": {
          "auraAdd": {
            "buffs": {
              "damageMul": 1.108
            }
          }
        }
      },
      {
        "id": "overseer_haste",
        "tier": 2,
        "name": "Haste Protocol",
        "cost": 150,
        "description": "Stronger aura.",
        "requires": [
          "overseer_drill"
        ],
        "effects": {
          "auraAdd": {
            "buffs": {
              "fireRateMul": 1.162
            }
          }
        }
      },
      {
        "id": "overseer_command",
        "tier": 3,
        "name": "Command Link",
        "cost": 194,
        "description": "Stronger aura.",
        "requires": [
          "overseer_focus"
        ],
        "effects": {
          "auraAdd": {
            "radius": 187,
            "buffs": {
              "rangeMul": 1.162
            }
          }
        }
      },
      {
        "id": "overseer_overclock",
        "tier": 3,
        "name": "Overclock",
        "cost": 194,
        "description": "Stronger aura.",
        "requires": [
          "overseer_haste"
        ],
        "effects": {
          "auraAdd": {
            "buffs": {
              "damageMul": 1.09,
              "projectileSpeedMul": 1.225
            }
          }
        }
      }
    ]
  },
  "chronomancer": {
    "id": "chronomancer",
    "name": "Chronomancer",
    "role": "slowing",
    "cost": 102,
    "color": "#93c5fd",
    "stats": {
      "range": 140,
      "fireRate": 0.75,
      "damage": 4.1,
      "damageType": "arcane",
      "projectileSpeed": 240,
      "targeting": "first",
      "onHitEffects": [
        {
          "type": "slow",
          "magnitude": 0.24,
          "duration": 1.87
        }
      ],
      "ability": {
        "name": "Time Rift",
        "type": "nova",
        "cooldown": 12,
        "radius": 85.5,
        "damage": 8.8,
        "damageType": "arcane",
        "effects": [
          {
            "type": "stun",
            "magnitude": 1,
            "duration": 0.28
          },
          {
            "type": "slow",
            "magnitude": 0.39,
            "duration": 1.87
          }
        ]
      }
    },
    "upgrades": [
      {
        "id": "chrono_dilation",
        "tier": 1,
        "name": "Time Dilation",
        "cost": 98,
        "description": "Applies slow.",
        "excludes": [
          "chrono_quantum"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "slow",
              "magnitude": 0.39,
              "duration": 2.38
            }
          ]
        }
      },
      {
        "id": "chrono_quantum",
        "tier": 1,
        "name": "Quantum Reach",
        "cost": 98,
        "description": "Longer range, Faster projectiles.",
        "excludes": [
          "chrono_dilation"
        ],
        "effects": {
          "statsMul": {
            "range": 1.17,
            "projectileSpeed": 1.17
          }
        }
      },
      {
        "id": "chrono_stasis",
        "tier": 2,
        "name": "Stasis Field",
        "cost": 140,
        "description": "Improves ability.",
        "requires": [
          "chrono_dilation"
        ],
        "effects": {
          "abilityAdd": {
            "cooldown": -1.7,
            "radius": 10.2
          },
          "addAbilityEffects": [
            {
              "type": "stun",
              "magnitude": 1,
              "duration": 0.18
            }
          ]
        }
      },
      {
        "id": "chrono_echo",
        "tier": 2,
        "name": "Phase Echo",
        "cost": 134,
        "description": "Faster firing, Improves ability.",
        "requires": [
          "chrono_quantum"
        ],
        "effects": {
          "statsMul": {
            "fireRate": 1.213
          },
          "abilityAdd": {
            "damage": 3.4
          }
        }
      },
      {
        "id": "chrono_collapse",
        "tier": 3,
        "name": "Chronal Collapse",
        "cost": 200,
        "description": "Improves ability.",
        "requires": [
          "chrono_stasis"
        ],
        "effects": {
          "abilityAdd": {
            "damage": 5.1,
            "radius": 8.5
          },
          "addAbilityEffects": [
            {
              "type": "vulnerability",
              "magnitude": 0.17,
              "duration": 3.3
            }
          ]
        }
      },
      {
        "id": "chrono_loop",
        "tier": 3,
        "name": "Paradox Loop",
        "cost": 194,
        "description": "Faster firing, Improves ability.",
        "requires": [
          "chrono_echo"
        ],
        "effects": {
          "abilityMul": {
            "cooldown": 0.745
          },
          "statsMul": {
            "fireRate": 1.17
          }
        }
      }
    ]
  },
  "stormcaller": {
    "id": "stormcaller",
    "name": "Stormcaller",
    "role": "splash",
    "cost": 128,
    "color": "#7dd3fc",
    "stats": {
      "range": 152,
      "fireRate": 0.59,
      "damage": 10.08,
      "damageType": "lightning",
      "projectileSpeed": 266,
      "targeting": "closest",
      "chain": {
        "maxJumps": 1,
        "range": 63,
        "falloff": 0.76
      },
      "ability": {
        "name": "Lightning Barrage",
        "type": "volley",
        "cooldown": 9.6,
        "range": 171,
        "count": 3,
        "damage": 13.2,
        "damageType": "lightning",
        "projectileSpeed": 320,
        "chain": {
          "maxJumps": 2,
          "range": 81,
          "falloff": 0.67
        }
      }
    },
    "upgrades": [
      {
        "id": "storm_charged",
        "tier": 1,
        "name": "Charged Core",
        "cost": 113,
        "description": "Higher damage.",
        "excludes": [
          "storm_forked"
        ],
        "effects": {
          "statsMul": {
            "damage": 1.255
          }
        }
      },
      {
        "id": "storm_forked",
        "tier": 1,
        "name": "Forked Burst",
        "cost": 107,
        "description": "Improves ability.",
        "excludes": [
          "storm_charged"
        ],
        "effects": {
          "abilityAdd": {
            "count": 2
          }
        }
      },
      {
        "id": "storm_supercells",
        "tier": 2,
        "name": "Supercells",
        "cost": 150,
        "description": "Improves ability.",
        "requires": [
          "storm_charged"
        ],
        "effects": {
          "abilityAdd": {
            "damage": 4.25
          },
          "abilityChainAdd": {
            "maxJumps": 1
          }
        }
      },
      {
        "id": "storm_static",
        "tier": 2,
        "name": "Static Surge",
        "cost": 145,
        "description": "Improves ability.",
        "requires": [
          "storm_forked"
        ],
        "effects": {
          "addAbilityEffects": [
            {
              "type": "stun",
              "magnitude": 1,
              "duration": 0.21
            }
          ]
        }
      },
      {
        "id": "storm_tempest",
        "tier": 3,
        "name": "Tempest Core",
        "cost": 205,
        "description": "Improves ability.",
        "requires": [
          "storm_supercells"
        ],
        "effects": {
          "abilityAdd": {
            "count": 2
          },
          "addAbilityEffects": [
            {
              "type": "slow",
              "magnitude": 0.22,
              "duration": 1.36
            }
          ]
        }
      },
      {
        "id": "storm_front",
        "tier": 3,
        "name": "Stormfront",
        "cost": 200,
        "description": "Improves ability.",
        "requires": [
          "storm_static"
        ],
        "effects": {
          "abilityMul": {
            "damage": 1.213
          },
          "abilityChainMul": {
            "range": 1.17
          }
        }
      }
    ]
  },
  "geomancer": {
    "id": "geomancer",
    "name": "Geomancer",
    "role": "splash",
    "cost": 117,
    "color": "#fca5a5",
    "stats": {
      "range": 123.5,
      "fireRate": 0.55,
      "damage": 13.44,
      "damageType": "physical",
      "projectileSpeed": 228,
      "splashRadius": 43.52,
      "targeting": "first",
      "ability": {
        "name": "Seismic Pulse",
        "type": "nova",
        "cooldown": 10.8,
        "radius": 76,
        "damage": 11,
        "damageType": "physical",
        "effects": [
          {
            "type": "armor_reduction",
            "magnitude": 2.7,
            "duration": 2.7,
            "mode": "flat"
          },
          {
            "type": "stun",
            "magnitude": 1,
            "duration": 0.18
          }
        ]
      }
    },
    "upgrades": [
      {
        "id": "geo_stonefletch",
        "tier": 1,
        "name": "Stonefletch",
        "cost": 107,
        "description": "Higher damage.",
        "excludes": [
          "geo_reach"
        ],
        "effects": {
          "statsMul": {
            "damage": 1.213
          }
        }
      },
      {
        "id": "geo_reach",
        "tier": 1,
        "name": "Earthen Reach",
        "cost": 107,
        "description": "Longer range, Larger splash.",
        "excludes": [
          "geo_stonefletch"
        ],
        "effects": {
          "statsMul": {
            "range": 1.17,
            "splashRadius": 1.17
          }
        }
      },
      {
        "id": "geo_seismic",
        "tier": 2,
        "name": "Seismic Wave",
        "cost": 150,
        "description": "Improves ability.",
        "requires": [
          "geo_stonefletch"
        ],
        "effects": {
          "abilityAdd": {
            "damage": 5.1,
            "radius": 13.6
          },
          "addAbilityEffects": [
            {
              "type": "stun",
              "magnitude": 1,
              "duration": 0.14
            }
          ]
        }
      },
      {
        "id": "geo_fault",
        "tier": 2,
        "name": "Fault Lines",
        "cost": 145,
        "description": "Applies slow, Shreds armor.",
        "requires": [
          "geo_reach"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "slow",
              "magnitude": 0.28,
              "duration": 1.7
            },
            {
              "type": "armor_reduction",
              "magnitude": 1.8,
              "duration": 2.34,
              "mode": "flat"
            }
          ]
        }
      },
      {
        "id": "geo_cataclysm",
        "tier": 3,
        "name": "Cataclysm",
        "cost": 205,
        "description": "Improves ability.",
        "requires": [
          "geo_seismic"
        ],
        "effects": {
          "abilityMul": {
            "damage": 1.34
          },
          "abilityAdd": {
            "radius": 15.3
          }
        }
      },
      {
        "id": "geo_prison",
        "tier": 3,
        "name": "Stone Prison",
        "cost": 194,
        "description": "Shreds armor.",
        "requires": [
          "geo_fault"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "armor_reduction",
              "magnitude": 0.23,
              "duration": 2.7,
              "mode": "percent"
            }
          ]
        }
      }
    ]
  },
  "railgun": {
    "id": "railgun",
    "name": "Railgun",
    "role": "single-target",
    "cost": 386,
    "endgame": true,
    "color": "#cbd5f5",
    "stats": {
      "range": 358.8,
      "fireRate": 0.25,
      "damage": 98.82,
      "damageType": "physical",
      "projectileSpeed": 582.4,
      "critChance": 0.085,
      "critMult": 2.42,
      "targeting": "strongest",
      "ability": {
        "name": "Rail Strike",
        "type": "volley",
        "cooldown": 14.4,
        "range": 266,
        "count": 1,
        "damage": 121,
        "damageType": "physical",
        "projectileSpeed": 560,
        "bonusTags": [
          "elite",
          "boss"
        ],
        "bonusMult": 1.4
      }
    },
    "upgrades": [
      {
        "id": "rail_velocity",
        "tier": 1,
        "name": "High Velocity",
        "cost": 140,
        "description": "Higher damage, Longer range.",
        "excludes": [
          "rail_stabilizer"
        ],
        "effects": {
          "statsMul": {
            "damage": 1.17,
            "range": 1.17
          }
        }
      },
      {
        "id": "rail_stabilizer",
        "tier": 1,
        "name": "Gyro Stabilizer",
        "cost": 134,
        "description": "Faster firing, Higher crit chance.",
        "excludes": [
          "rail_velocity"
        ],
        "effects": {
          "statsMul": {
            "fireRate": 1.213
          },
          "statsAdd": {
            "critChance": 0.06
          }
        }
      },
      {
        "id": "rail_piercer",
        "tier": 2,
        "name": "Armor Piercer",
        "cost": 189,
        "description": "Shreds armor, Bonus damage.",
        "requires": [
          "rail_velocity"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "armor_reduction",
              "magnitude": 4.5,
              "duration": 3.6,
              "mode": "flat"
            }
          ],
          "addBonusTags": [
            "elite",
            "boss"
          ],
          "bonusMultAdd": 0.21
        }
      },
      {
        "id": "rail_capacitor",
        "tier": 2,
        "name": "Capacitor",
        "cost": 178,
        "description": "Stronger crits, Improves ability.",
        "requires": [
          "rail_stabilizer"
        ],
        "effects": {
          "statsMul": {
            "critMult": 1.255
          },
          "abilityAdd": {
            "damage": 21.25
          }
        }
      },
      {
        "id": "rail_execution",
        "tier": 3,
        "name": "Execution Protocol",
        "cost": 243,
        "description": "Improves ability, Bonus damage.",
        "requires": [
          "rail_piercer"
        ],
        "effects": {
          "abilityAdd": {
            "damage": 34
          },
          "bonusMultAdd": 0.34,
          "addBonusTags": [
            "elite",
            "boss"
          ]
        }
      },
      {
        "id": "rail_overdrive",
        "tier": 3,
        "name": "Overdrive Coil",
        "cost": 232,
        "description": "Higher damage, Faster firing.",
        "requires": [
          "rail_capacitor"
        ],
        "effects": {
          "statsMul": {
            "fireRate": 1.17,
            "damage": 1.085
          }
        }
      },
      {
        "id": "rail_orbital",
        "tier": 4,
        "name": "Orbital Lance",
        "cost": 405,
        "description": "Improves ability.",
        "requires": [
          "rail_execution"
        ],
        "effects": {
          "abilityAdd": {
            "count": 1,
            "damage": 68
          },
          "abilityMul": {
            "cooldown": 0.83
          },
          "addAbilityEffects": [
            {
              "type": "stun",
              "magnitude": 1,
              "duration": 0.25
            }
          ]
        }
      },
      {
        "id": "rail_singularity",
        "tier": 4,
        "name": "Singularity Coil",
        "cost": 383,
        "description": "Higher damage, Faster firing, Improves ability.",
        "requires": [
          "rail_overdrive"
        ],
        "effects": {
          "statsMul": {
            "fireRate": 1.153,
            "damage": 1.102
          },
          "abilityAdd": {
            "damage": 38.25
          },
          "addAbilityEffects": [
            {
              "type": "armor_reduction",
              "magnitude": 4.5,
              "duration": 2.7,
              "mode": "flat"
            }
          ]
        }
      }
    ]
  },
  "judicator": {
    "id": "judicator",
    "name": "Judicator",
    "role": "single-target",
    "cost": 448,
    "endgame": true,
    "color": "#f472b6",
    "stats": {
      "range": 286,
      "fireRate": 0.24,
      "damage": 128.5,
      "damageType": "arcane",
      "projectileSpeed": 520,
      "critChance": 0.11,
      "critMult": 2.6,
      "targeting": "strongest"
    },
    "upgrades": [
      {
        "id": "judicator_oath",
        "tier": 1,
        "name": "Oath Sigils",
        "cost": 194,
        "description": "Higher damage, Longer range.",
        "excludes": [
          "judicator_overdrive"
        ],
        "effects": {
          "statsMul": {
            "damage": 1.17,
            "range": 1.12
          }
        }
      },
      {
        "id": "judicator_overdrive",
        "tier": 1,
        "name": "Pulse Overdrive",
        "cost": 184,
        "description": "Faster firing, Higher crit chance.",
        "excludes": [
          "judicator_oath"
        ],
        "effects": {
          "statsMul": {
            "fireRate": 1.255
          },
          "statsAdd": {
            "critChance": 0.06
          }
        }
      },
      {
        "id": "judicator_verdict",
        "tier": 2,
        "name": "Null Verdict",
        "cost": 254,
        "description": "Bonus damage.",
        "requires": [
          "judicator_oath"
        ],
        "effects": {
          "addBonusTags": [
            "elite",
            "boss"
          ],
          "bonusMultAdd": 0.24
        }
      },
      {
        "id": "judicator_focus",
        "tier": 2,
        "name": "Judged Focus",
        "cost": 238,
        "description": "Higher damage, Stronger crits.",
        "requires": [
          "judicator_overdrive"
        ],
        "effects": {
          "statsMul": {
            "damage": 1.085,
            "critMult": 1.17
          }
        }
      },
      {
        "id": "judicator_edict",
        "tier": 3,
        "name": "Final Edict",
        "cost": 334,
        "description": "Higher damage, Higher crit chance.",
        "requires": [
          "judicator_verdict"
        ],
        "effects": {
          "statsMul": {
            "damage": 1.34
          },
          "statsAdd": {
            "critChance": 0.08
          }
        }
      },
      {
        "id": "judicator_sanction",
        "tier": 3,
        "name": "Sanctioned Barrage",
        "cost": 318,
        "description": "Faster firing, Stronger crits.",
        "requires": [
          "judicator_focus"
        ],
        "effects": {
          "statsMul": {
            "fireRate": 1.213,
            "critMult": 1.128
          }
        }
      },
      {
        "id": "judicator_execution",
        "tier": 4,
        "name": "Execution Edict",
        "cost": 470,
        "description": "Unlocks a devastating finisher.",
        "requires": [
          "judicator_edict"
        ],
        "effects": {
          "setAbility": {
            "name": "Execution Edict",
            "type": "volley",
            "cooldown": 14.4,
            "range": 230,
            "count": 1,
            "damage": 214.5,
            "damageType": "arcane",
            "projectileSpeed": 600,
            "bonusTags": [
              "elite",
              "boss"
            ],
            "bonusMult": 1.6,
            "executeThreshold": 0.3,
            "executeMult": 1.85,
            "vfx": {
              "type": "beam",
              "color": "rgba(244,114,182,0.9)",
              "width": 3.6,
              "life": 0.26
            },
            "effects": [
              {
                "type": "vulnerability",
                "magnitude": 0.22,
                "duration": 3.3
              }
            ]
          }
        }
      },
      {
        "id": "judicator_null",
        "tier": 4,
        "name": "Null Decree",
        "cost": 448,
        "description": "Unlocks a crippling finisher.",
        "requires": [
          "judicator_sanction"
        ],
        "effects": {
          "setAbility": {
            "name": "Null Decree",
            "type": "volley",
            "cooldown": 12.6,
            "range": 221,
            "count": 1,
            "damage": 183.5,
            "damageType": "arcane",
            "projectileSpeed": 600,
            "vfx": {
              "type": "pulse",
              "color": "rgba(251,191,36,0.85)",
              "radius": 44,
              "life": 0.3
            },
            "effects": [
              {
                "type": "stun",
                "magnitude": 1,
                "duration": 0.35
              },
              {
                "type": "armor_reduction",
                "magnitude": 4.2,
                "duration": 2.86,
                "mode": "flat"
              }
            ]
          }
        }
      }
    ]
  },
  "riftpiercer": {
    "id": "riftpiercer",
    "name": "Rift Piercer",
    "role": "single-target",
    "cost": 472,
    "endgame": true,
    "color": "#38bdf8",
    "stats": {
      "range": 265,
      "fireRate": 0.2,
      "damage": 146.5,
      "damageType": "lightning",
      "projectileSpeed": 500,
      "critChance": 0.085,
      "critMult": 2.7,
      "targeting": "strongest"
    },
    "upgrades": [
      {
        "id": "riftpiercer_phase",
        "tier": 1,
        "name": "Phase Barrel",
        "cost": 198,
        "description": "Higher damage, Longer range.",
        "excludes": [
          "riftpiercer_rails"
        ],
        "effects": {
          "statsMul": {
            "damage": 1.17,
            "range": 1.17
          }
        }
      },
      {
        "id": "riftpiercer_rails",
        "tier": 1,
        "name": "Overclocked Rails",
        "cost": 188,
        "description": "Faster firing, Faster projectiles.",
        "excludes": [
          "riftpiercer_phase"
        ],
        "effects": {
          "statsMul": {
            "fireRate": 1.298,
            "projectileSpeed": 1.17
          }
        }
      },
      {
        "id": "riftpiercer_shred",
        "tier": 2,
        "name": "Quantum Shred",
        "cost": 264,
        "description": "Shreds armor.",
        "requires": [
          "riftpiercer_phase"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "armor_reduction",
              "magnitude": 4.2,
              "duration": 3.08,
              "mode": "flat"
            }
          ]
        }
      },
      {
        "id": "riftpiercer_capacitor",
        "tier": 2,
        "name": "Storm Capacitor",
        "cost": 246,
        "description": "Stronger crits, Higher crit chance.",
        "requires": [
          "riftpiercer_rails"
        ],
        "effects": {
          "statsMul": {
            "critMult": 1.17
          },
          "statsAdd": {
            "critChance": 0.06
          }
        }
      },
      {
        "id": "riftpiercer_singularity",
        "tier": 3,
        "name": "Singularity Round",
        "cost": 340,
        "description": "Higher damage, Bonus damage.",
        "requires": [
          "riftpiercer_shred"
        ],
        "effects": {
          "statsMul": {
            "damage": 1.34
          },
          "addBonusTags": [
            "elite",
            "boss"
          ],
          "bonusMultAdd": 0.3
        }
      },
      {
        "id": "riftpiercer_tempest",
        "tier": 3,
        "name": "Tempest Trigger",
        "cost": 324,
        "description": "Faster firing, Higher damage.",
        "requires": [
          "riftpiercer_capacitor"
        ],
        "effects": {
          "statsMul": {
            "fireRate": 1.255,
            "damage": 1.085
          }
        }
      },
      {
        "id": "riftpiercer_lance",
        "tier": 4,
        "name": "Rift Lance",
        "cost": 480,
        "description": "Unlocks a boss-piercing finisher.",
        "requires": [
          "riftpiercer_singularity"
        ],
        "effects": {
          "setAbility": {
            "name": "Rift Lance",
            "type": "volley",
            "cooldown": 16.8,
            "range": 240,
            "count": 1,
            "damage": 238.5,
            "damageType": "lightning",
            "projectileSpeed": 640,
            "bonusTags": [
              "elite",
              "boss"
            ],
            "bonusMult": 1.7,
            "vfx": {
              "type": "beam",
              "color": "rgba(56,189,248,0.9)",
              "width": 3.9,
              "life": 0.24
            },
            "effects": [
              {
                "type": "stun",
                "magnitude": 1,
                "duration": 0.32
              },
              {
                "type": "armor_reduction",
                "magnitude": 3.8,
                "duration": 2.64,
                "mode": "flat"
              }
            ]
          }
        }
      },
      {
        "id": "riftpiercer_requiem",
        "tier": 4,
        "name": "Storm Requiem",
        "cost": 460,
        "description": "Unlocks a crippling finisher.",
        "requires": [
          "riftpiercer_tempest"
        ],
        "effects": {
          "setAbility": {
            "name": "Storm Requiem",
            "type": "volley",
            "cooldown": 12.6,
            "range": 232,
            "count": 1,
            "damage": 195.5,
            "damageType": "lightning",
            "projectileSpeed": 640,
            "vfx": {
              "type": "zap",
              "color": "rgba(125,211,252,0.92)",
              "life": 0.2
            },
            "effects": [
              {
                "type": "vulnerability",
                "magnitude": 0.2,
                "duration": 3.08
              },
              {
                "type": "slow",
                "magnitude": 0.28,
                "duration": 2.21
              }
            ]
          }
        }
      }
    ]
  },
  "rocketpod": {
    "id": "rocketpod",
    "name": "Rocket Pod",
    "role": "splash",
    "cost": 339,
    "endgame": true,
    "color": "#f97316",
    "stats": {
      "range": 171,
      "fireRate": 0.51,
      "damage": 22.4,
      "damageType": "fire",
      "projectileSpeed": 228,
      "splashRadius": 74.24,
      "targeting": "first",
      "onHitEffects": [
        {
          "type": "burn",
          "magnitude": 1.98,
          "duration": 2.86,
          "tickEvery": 0.5,
          "damageType": "fire"
        }
      ],
      "ability": {
        "name": "Salvo",
        "type": "volley",
        "cooldown": 10.8,
        "range": 190,
        "count": 4,
        "damage": 17.6,
        "damageType": "fire",
        "projectileSpeed": 280,
        "splashRadius": 45,
        "effects": [
          {
            "type": "burn",
            "magnitude": 1.44,
            "duration": 2.42,
            "tickEvery": 0.5,
            "damageType": "fire"
          }
        ]
      }
    },
    "upgrades": [
      {
        "id": "rocket_barrage",
        "tier": 1,
        "name": "Barrage",
        "cost": 140,
        "description": "Larger splash.",
        "excludes": [
          "rocket_fuel"
        ],
        "effects": {
          "statsMul": {
            "splashRadius": 1.213
          }
        }
      },
      {
        "id": "rocket_fuel",
        "tier": 1,
        "name": "High-Octane Fuel",
        "cost": 134,
        "description": "Faster firing.",
        "excludes": [
          "rocket_barrage"
        ],
        "effects": {
          "statsMul": {
            "fireRate": 1.213
          }
        }
      },
      {
        "id": "rocket_napalm",
        "tier": 2,
        "name": "Napalm Pods",
        "cost": 183,
        "description": "Applies burn, Exposes targets.",
        "requires": [
          "rocket_barrage"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "burn",
              "magnitude": 1.62,
              "duration": 3.08,
              "tickEvery": 0.5,
              "damageType": "fire"
            },
            {
              "type": "vulnerability",
              "magnitude": 0.1,
              "duration": 2.64
            }
          ]
        }
      },
      {
        "id": "rocket_cluster",
        "tier": 2,
        "name": "Cluster Salvo",
        "cost": 178,
        "description": "Improves ability.",
        "requires": [
          "rocket_fuel"
        ],
        "effects": {
          "abilityAdd": {
            "count": 2
          }
        }
      },
      {
        "id": "rocket_inferno",
        "tier": 3,
        "name": "Inferno Payload",
        "cost": 243,
        "description": "Improves ability.",
        "requires": [
          "rocket_napalm"
        ],
        "effects": {
          "abilityAdd": {
            "damage": 6.8,
            "splashRadius": 8.5
          }
        }
      },
      {
        "id": "rocket_shock",
        "tier": 3,
        "name": "Shockwave Pods",
        "cost": 232,
        "description": "Improves ability.",
        "requires": [
          "rocket_cluster"
        ],
        "effects": {
          "addAbilityEffects": [
            {
              "type": "stun",
              "magnitude": 1,
              "duration": 0.25
            }
          ]
        }
      },
      {
        "id": "rocket_cataclysm",
        "tier": 4,
        "name": "Cataclysm Barrage",
        "cost": 405,
        "description": "Improves ability.",
        "requires": [
          "rocket_inferno"
        ],
        "effects": {
          "abilityAdd": {
            "count": 2,
            "damage": 10.2,
            "splashRadius": 13.6
          },
          "abilityMul": {
            "cooldown": 0.873
          },
          "addAbilityEffects": [
            {
              "type": "burn",
              "magnitude": 2.16,
              "duration": 3.52,
              "tickEvery": 0.6,
              "damageType": "fire"
            }
          ]
        }
      },
      {
        "id": "rocket_thunder",
        "tier": 4,
        "name": "Thunder Salvo",
        "cost": 394,
        "description": "Faster firing, Improves ability.",
        "requires": [
          "rocket_shock"
        ],
        "effects": {
          "abilityAdd": {
            "count": 3,
            "damage": 6.8
          },
          "addAbilityEffects": [
            {
              "type": "stun",
              "magnitude": 1,
              "duration": 0.32
            }
          ],
          "statsMul": {
            "fireRate": 1.085
          }
        }
      }
    ]
  },
  "beacon": {
    "id": "beacon",
    "name": "Beacon",
    "role": "support",
    "cost": 390,
    "endgame": true,
    "color": "#22d3ee",
    "stats": {
      "aura": {
        "radius": 174.8,
        "buffs": {
          "damageMul": 1.168,
          "rangeMul": 1.134
        }
      },
      "ability": {
        "name": "Signal Burst",
        "type": "nova",
        "cooldown": 16.8,
        "radius": 114,
        "damage": 8.8,
        "damageType": "arcane",
        "effects": [
          {
            "type": "slow",
            "magnitude": 0.28,
            "duration": 1.87
          },
          {
            "type": "vulnerability",
            "magnitude": 0.13,
            "duration": 3.08
          }
        ]
      }
    },
    "upgrades": [
      {
        "id": "beacon_uplink",
        "tier": 1,
        "name": "Uplink Array",
        "cost": 145,
        "description": "Stronger aura.",
        "excludes": [
          "beacon_amplify"
        ],
        "effects": {
          "auraAdd": {
            "radius": 195.5
          }
        }
      },
      {
        "id": "beacon_amplify",
        "tier": 1,
        "name": "Amplified Core",
        "cost": 150,
        "description": "Stronger aura.",
        "excludes": [
          "beacon_uplink"
        ],
        "effects": {
          "auraAdd": {
            "buffs": {
              "damageMul": 1.198
            }
          }
        }
      },
      {
        "id": "beacon_overclock",
        "tier": 2,
        "name": "Overclock Grid",
        "cost": 200,
        "description": "Stronger aura.",
        "requires": [
          "beacon_uplink"
        ],
        "effects": {
          "auraAdd": {
            "buffs": {
              "fireRateMul": 1.108
            }
          }
        }
      },
      {
        "id": "beacon_spotter",
        "tier": 2,
        "name": "Spotter Network",
        "cost": 194,
        "description": "Stronger aura.",
        "requires": [
          "beacon_amplify"
        ],
        "effects": {
          "auraAdd": {
            "buffs": {
              "projectileSpeedMul": 1.162
            }
          }
        }
      },
      {
        "id": "beacon_command",
        "tier": 3,
        "name": "Command Net",
        "cost": 254,
        "description": "Stronger aura.",
        "requires": [
          "beacon_overclock"
        ],
        "effects": {
          "auraAdd": {
            "radius": 221,
            "buffs": {
              "rangeMul": 1.162
            }
          }
        }
      },
      {
        "id": "beacon_radiance",
        "tier": 3,
        "name": "Radiant Storm",
        "cost": 243,
        "description": "Improves ability.",
        "requires": [
          "beacon_spotter"
        ],
        "effects": {
          "abilityAdd": {
            "damage": 5.1,
            "radius": 10.2
          },
          "abilityMul": {
            "cooldown": 0.83
          }
        }
      },
      {
        "id": "beacon_skylink",
        "tier": 4,
        "name": "Skylink Crown",
        "cost": 405,
        "description": "Stronger aura, Improves ability.",
        "requires": [
          "beacon_command"
        ],
        "effects": {
          "auraAdd": {
            "radius": 255,
            "buffs": {
              "damageMul": 1.108,
              "rangeMul": 1.09
            }
          },
          "abilityAdd": {
            "damage": 8.5,
            "radius": 13.6
          }
        }
      },
      {
        "id": "beacon_prism",
        "tier": 4,
        "name": "Prism Surge",
        "cost": 383,
        "description": "Improves ability.",
        "requires": [
          "beacon_radiance"
        ],
        "effects": {
          "abilityMul": {
            "cooldown": 0.703
          },
          "abilityAdd": {
            "damage": 10.2,
            "radius": 15.3
          },
          "addAbilityEffects": [
            {
              "type": "stun",
              "magnitude": 1,
              "duration": 0.18
            }
          ]
        }
      }
    ]
  },
  "citadel": {
    "id": "citadel",
    "name": "Citadel",
    "role": "support",
    "cost": 434,
    "endgame": true,
    "color": "#a78bfa",
    "stats": {
      "aura": {
        "radius": 161,
        "buffs": {
          "fireRateMul": 1.168,
          "projectileSpeedMul": 1.168
        }
      },
      "ability": {
        "name": "Shockwave",
        "type": "nova",
        "cooldown": 19.2,
        "radius": 95,
        "damage": 11,
        "damageType": "physical",
        "effects": [
          {
            "type": "stun",
            "magnitude": 1,
            "duration": 0.25
          },
          {
            "type": "armor_reduction",
            "magnitude": 1.8,
            "duration": 2.25,
            "mode": "flat"
          }
        ]
      }
    },
    "upgrades": [
      {
        "id": "citadel_bulwark",
        "tier": 1,
        "name": "Bulwark",
        "cost": 167,
        "description": "Stronger aura.",
        "excludes": [
          "citadel_fury"
        ],
        "effects": {
          "auraAdd": {
            "radius": 178.5
          }
        }
      },
      {
        "id": "citadel_fury",
        "tier": 1,
        "name": "War Fury",
        "cost": 173,
        "description": "Stronger aura.",
        "excludes": [
          "citadel_bulwark"
        ],
        "effects": {
          "auraAdd": {
            "buffs": {
              "damageMul": 1.108
            }
          }
        }
      },
      {
        "id": "citadel_siege",
        "tier": 2,
        "name": "Siege Orders",
        "cost": 205,
        "description": "Stronger aura.",
        "requires": [
          "citadel_fury"
        ],
        "effects": {
          "auraAdd": {
            "buffs": {
              "damageMul": 1.162
            }
          }
        }
      },
      {
        "id": "citadel_accelerant",
        "tier": 2,
        "name": "Accelerant",
        "cost": 200,
        "description": "Stronger aura.",
        "requires": [
          "citadel_bulwark"
        ],
        "effects": {
          "auraAdd": {
            "buffs": {
              "fireRateMul": 1.198
            }
          }
        }
      },
      {
        "id": "citadel_bastion",
        "tier": 3,
        "name": "Bastion",
        "cost": 254,
        "description": "Stronger aura.",
        "requires": [
          "citadel_accelerant"
        ],
        "effects": {
          "auraAdd": {
            "radius": 204,
            "buffs": {
              "projectileSpeedMul": 1.27
            }
          }
        }
      },
      {
        "id": "citadel_war_drums",
        "tier": 3,
        "name": "War Drums",
        "cost": 243,
        "description": "Improves ability.",
        "requires": [
          "citadel_siege"
        ],
        "effects": {
          "abilityAdd": {
            "damage": 5.1,
            "radius": 8.5
          },
          "abilityMul": {
            "cooldown": 0.745
          }
        }
      },
      {
        "id": "citadel_fortress",
        "tier": 4,
        "name": "Fortress Core",
        "cost": 405,
        "description": "Stronger aura, Improves ability.",
        "requires": [
          "citadel_bastion"
        ],
        "effects": {
          "auraAdd": {
            "radius": 238,
            "buffs": {
              "projectileSpeedMul": 1.315,
              "fireRateMul": 1.09
            }
          },
          "abilityAdd": {
            "damage": 6.8,
            "radius": 11.9
          }
        }
      },
      {
        "id": "citadel_thunder",
        "tier": 4,
        "name": "Thunder Drums",
        "cost": 394,
        "description": "Improves ability.",
        "requires": [
          "citadel_war_drums"
        ],
        "effects": {
          "abilityMul": {
            "cooldown": 0.66
          },
          "abilityAdd": {
            "damage": 8.5,
            "radius": 15.3
          },
          "addAbilityEffects": [
            {
              "type": "slow",
              "magnitude": 0.28,
              "duration": 2.04
            }
          ]
        }
      }
    ]
  },
  "obliterator": {
    "id": "obliterator",
    "name": "Obliterator",
    "role": "dps",
    "cost": 1042,
    "endgame": true,
    "color": "#f97316",
    "stats": {
      "range": 158.17,
      "fireRate": 0.39,
      "damage": 81.6,
      "damageType": "physical",
      "projectileSpeed": 360,
      "critChance": 0.102,
      "critMult": 2.42,
      "targeting": "strongest"
    },
    "upgrades": [
      {
        "id": "obliterator_lensing",
        "tier": 1,
        "name": "Magnetic Lensing",
        "cost": 210,
        "description": "Higher damage, Longer range.",
        "excludes": [
          "obliterator_overfeed"
        ],
        "effects": {
          "statsMul": {
            "damage": 1.255,
            "range": 1.085
          }
        }
      },
      {
        "id": "obliterator_overfeed",
        "tier": 1,
        "name": "Overcharged Feed",
        "cost": 200,
        "description": "Lower damage, Faster firing.",
        "excludes": [
          "obliterator_lensing"
        ],
        "effects": {
          "statsMul": {
            "fireRate": 1.213,
            "damage": 0.915
          }
        }
      },
      {
        "id": "obliterator_annihilator",
        "tier": 2,
        "name": "Annihilator Rounds",
        "cost": 254,
        "description": "Bonus damage.",
        "requires": [
          "obliterator_lensing"
        ],
        "effects": {
          "addBonusTags": [
            "elite",
            "boss"
          ],
          "bonusMultMul": 1.255
        }
      },
      {
        "id": "obliterator_burst",
        "tier": 2,
        "name": "Stabilized Burst",
        "cost": 243,
        "description": "Faster firing, Higher crit chance.",
        "requires": [
          "obliterator_overfeed"
        ],
        "effects": {
          "statsMul": {
            "fireRate": 1.128
          },
          "statsAdd": {
            "critChance": 0.08
          }
        }
      },
      {
        "id": "obliterator_worldsplitter",
        "tier": 3,
        "name": "Worldsplitter",
        "cost": 340,
        "description": "Higher damage, Higher crit chance.",
        "requires": [
          "obliterator_annihilator"
        ],
        "effects": {
          "statsMul": {
            "damage": 1.383
          },
          "statsAdd": {
            "critChance": 0.1
          }
        }
      },
      {
        "id": "obliterator_rend",
        "tier": 3,
        "name": "Rend Accelerator",
        "cost": 318,
        "description": "Faster firing, Stronger crits.",
        "requires": [
          "obliterator_burst"
        ],
        "effects": {
          "statsMul": {
            "fireRate": 1.298,
            "critMult": 1.17
          }
        }
      },
      {
        "id": "obliterator_apex",
        "tier": 4,
        "name": "Annihilation Array",
        "cost": 470,
        "description": "Improves ability.",
        "requires": [
          "obliterator_worldsplitter"
        ],
        "effects": {
          "setAbility": {
            "name": "Annihilation Volley",
            "type": "volley",
            "cooldown": 14.4,
            "range": 209,
            "count": 4,
            "damage": 121,
            "damageType": "physical",
            "projectileSpeed": 420,
            "bonusTags": [
              "elite",
              "boss"
            ],
            "bonusMult": 1.5,
            "effects": [
              {
                "type": "armor_reduction",
                "magnitude": 3.6,
                "duration": 2.7,
                "mode": "flat"
              }
            ]
          }
        }
      },
      {
        "id": "obliterator_rupture",
        "tier": 4,
        "name": "Rend Cascade",
        "cost": 448,
        "description": "Improves ability.",
        "requires": [
          "obliterator_rend"
        ],
        "effects": {
          "setAbility": {
            "name": "Rend Cascade",
            "type": "volley",
            "cooldown": 12,
            "range": 199.5,
            "count": 6,
            "damage": 82.5,
            "damageType": "physical",
            "projectileSpeed": 420,
            "effects": [
              {
                "type": "bleed",
                "magnitude": 2.94,
                "duration": 3.42,
                "tickEvery": 0.6,
                "damageType": "physical"
              }
            ]
          }
        }
      }
    ]
  },
  "sunbreaker": {
    "id": "sunbreaker",
    "name": "Sunbreaker",
    "role": "dps",
    "cost": 979,
    "endgame": true,
    "color": "#facc15",
    "stats": {
      "range": 128.25,
      "fireRate": 0.31,
      "damage": 95.63,
      "damageType": "fire",
      "projectileSpeed": 240,
      "splashRadius": 64,
      "critChance": 0.043,
      "critMult": 1.95,
      "targeting": "first"
    },
    "upgrades": [
      {
        "id": "sunbreaker_compression",
        "tier": 1,
        "name": "Solar Compression",
        "cost": 205,
        "description": "Higher damage, Larger splash.",
        "excludes": [
          "sunbreaker_cycler"
        ],
        "effects": {
          "statsMul": {
            "damage": 1.213
          },
          "statsAdd": {
            "splashRadius": 8
          }
        }
      },
      {
        "id": "sunbreaker_cycler",
        "tier": 1,
        "name": "Ignition Cycler",
        "cost": 194,
        "description": "Lower damage, Faster firing.",
        "excludes": [
          "sunbreaker_compression"
        ],
        "effects": {
          "statsMul": {
            "fireRate": 1.255,
            "damage": 0.915
          }
        }
      },
      {
        "id": "sunbreaker_starforged",
        "tier": 2,
        "name": "Starforged Shells",
        "cost": 243,
        "description": "Higher damage, Faster projectiles.",
        "requires": [
          "sunbreaker_compression"
        ],
        "effects": {
          "statsMul": {
            "damage": 1.17,
            "projectileSpeed": 1.128
          }
        }
      },
      {
        "id": "sunbreaker_detonators",
        "tier": 2,
        "name": "Twin Detonators",
        "cost": 232,
        "description": "Faster firing, Larger splash.",
        "requires": [
          "sunbreaker_cycler"
        ],
        "effects": {
          "statsMul": {
            "splashRadius": 1.34,
            "fireRate": 1.085
          }
        }
      },
      {
        "id": "sunbreaker_novalance",
        "tier": 3,
        "name": "Nova Lance",
        "cost": 340,
        "description": "Higher damage, Larger splash.",
        "requires": [
          "sunbreaker_starforged"
        ],
        "effects": {
          "statsMul": {
            "damage": 1.425,
            "splashRadius": 1.213
          }
        }
      },
      {
        "id": "sunbreaker_cascade",
        "tier": 3,
        "name": "Thermal Cascade",
        "cost": 324,
        "description": "Higher damage, Faster firing, Larger splash.",
        "requires": [
          "sunbreaker_detonators"
        ],
        "effects": {
          "statsMul": {
            "fireRate": 1.298,
            "splashRadius": 1.17,
            "damage": 1.128
          }
        }
      },
      {
        "id": "sunbreaker_supernova",
        "tier": 4,
        "name": "Supernova",
        "cost": 470,
        "description": "Improves ability.",
        "requires": [
          "sunbreaker_novalance"
        ],
        "effects": {
          "setAbility": {
            "name": "Supernova",
            "type": "nova",
            "cooldown": 14.4,
            "radius": 123.5,
            "damage": 154,
            "damageType": "fire",
            "effects": [
              {
                "type": "burn",
                "magnitude": 2.88,
                "duration": 4.62,
                "tickEvery": 0.7,
                "damageType": "fire"
              },
              {
                "type": "vulnerability",
                "magnitude": 0.17,
                "duration": 3.85
              }
            ]
          }
        }
      },
      {
        "id": "sunbreaker_eruption",
        "tier": 4,
        "name": "Solar Eruption",
        "cost": 448,
        "description": "Improves ability.",
        "requires": [
          "sunbreaker_cascade"
        ],
        "effects": {
          "setAbility": {
            "name": "Solar Eruption",
            "type": "nova",
            "cooldown": 12,
            "radius": 109.25,
            "damage": 121,
            "damageType": "fire",
            "effects": [
              {
                "type": "burn",
                "magnitude": 2.52,
                "duration": 3.96,
                "tickEvery": 0.6,
                "damageType": "fire"
              },
              {
                "type": "slow",
                "magnitude": 0.22,
                "duration": 2.04
              }
            ]
          }
        }
      }
    ]
  },
  "beamer": {
    "id": "beamer",
    "name": "Prism Beam",
    "role": "dps",
    "cost": 1130,
    "endgame": true,
    "color": "#a78bfa",
    "stats": {
      "range": 170.1,
      "fireRate": 0,
      "damage": 76.5,
      "damageType": "arcane",
      "projectileSpeed": 0,
      "beam": {
        "width": 2.88,
        "effectInterval": 0.63,
        "warmupDuration": 1.98,
        "warmupMin": 0.35,
        "decayDuration": 1.16
      },
      "targeting": "strongest"
    },
    "upgrades": [
      {
        "id": "beamer_focus",
        "tier": 1,
        "name": "Focusing Array",
        "cost": 221,
        "description": "Higher damage, Longer range.",
        "excludes": [
          "beamer_conduit"
        ],
        "effects": {
          "statsMul": {
            "damage": 1.298,
            "range": 1.085
          }
        }
      },
      {
        "id": "beamer_conduit",
        "tier": 1,
        "name": "Stabilized Conduit",
        "cost": 210,
        "description": "Higher damage, Longer range.",
        "excludes": [
          "beamer_focus"
        ],
        "effects": {
          "statsMul": {
            "range": 1.213,
            "damage": 1.085
          }
        }
      },
      {
        "id": "beamer_disrupt",
        "tier": 2,
        "name": "Disruption Core",
        "cost": 264,
        "description": "Exposes targets.",
        "requires": [
          "beamer_focus"
        ],
        "effects": {
          "addOnHitEffects": [
            {
              "type": "vulnerability",
              "magnitude": 0.19,
              "duration": 2.75
            }
          ]
        }
      },
      {
        "id": "beamer_resonance",
        "tier": 2,
        "name": "Resonant Field",
        "cost": 254,
        "description": "Bonus damage.",
        "requires": [
          "beamer_conduit"
        ],
        "effects": {
          "addBonusTags": [
            "elite",
            "boss"
          ],
          "bonusMultMul": 1.298
        }
      },
      {
        "id": "beamer_event_horizon",
        "tier": 3,
        "name": "Event Horizon",
        "cost": 351,
        "description": "Higher damage, Longer range.",
        "requires": [
          "beamer_disrupt"
        ],
        "effects": {
          "statsMul": {
            "damage": 1.425,
            "range": 1.128
          }
        }
      },
      {
        "id": "beamer_prismatic",
        "tier": 3,
        "name": "Prismatic Collapse",
        "cost": 340,
        "description": "Higher damage, Longer range.",
        "requires": [
          "beamer_resonance"
        ],
        "effects": {
          "statsMul": {
            "damage": 1.34,
            "range": 1.17
          }
        }
      },
      {
        "id": "beamer_parallax",
        "tier": 4,
        "name": "Parallax Nova",
        "cost": 470,
        "description": "Improves ability.",
        "requires": [
          "beamer_event_horizon"
        ],
        "effects": {
          "setAbility": {
            "name": "Prismatic Nova",
            "type": "nova",
            "cooldown": 13.2,
            "radius": 114,
            "damage": 88,
            "damageType": "arcane",
            "effects": [
              {
                "type": "vulnerability",
                "magnitude": 0.17,
                "duration": 3.3
              },
              {
                "type": "slow",
                "magnitude": 0.28,
                "duration": 2.21
              }
            ]
          }
        }
      },
      {
        "id": "beamer_spectrum",
        "tier": 4,
        "name": "Spectrum Barrage",
        "cost": 448,
        "description": "Improves ability.",
        "requires": [
          "beamer_prismatic"
        ],
        "effects": {
          "setAbility": {
            "name": "Spectrum Barrage",
            "type": "volley",
            "cooldown": 10.8,
            "range": 190,
            "count": 6,
            "damage": 49.5,
            "damageType": "arcane",
            "projectileSpeed": 340,
            "effects": [
              {
                "type": "vulnerability",
                "magnitude": 0.1,
                "duration": 2.42
              }
            ]
          }
        }
      }
    ]
  },
  "summoner": {
    "id": "summoner",
    "name": "Vanguard Kennel",
    "role": "summoner",
    "cost": 169,
    "color": "#34d399",
    "stats": {
      "range": 120,
      "fireRate": 0,
      "damage": 0,
      "damageType": "physical",
      "projectileSpeed": 240,
      "ability": {
        "type": "summon",
        "name": "Call Vanguard",
        "cooldown": 8.96,
        "count": 1,
        "radius": 85.5,
        "summon": {
          "id": "vanguard",
          "name": "Vanguard",
          "hp": 70.8,
          "speed": 58.9,
          "range": 110,
          "fireRate": 1.01,
          "damage": 7.56,
          "damageType": "physical",
          "projectileSpeed": 228,
          "radius": 8,
          "lifetime": 16.2,
          "cap": 3
        }
      }
    },
    "upgrades": [
      {
        "id": "summoner_drills",
        "tier": 1,
        "name": "Veteran Drills",
        "cost": 98,
        "description": "Improves ability.",
        "excludes": [
          "summoner_muster"
        ],
        "effects": {
          "abilityAdd": {
            "summon": {
              "hp": 23.6,
              "damage": 2.16,
              "lifetime": 1.8
            }
          }
        }
      },
      {
        "id": "summoner_muster",
        "tier": 1,
        "name": "Rapid Muster",
        "cost": 92,
        "description": "Improves ability.",
        "excludes": [
          "summoner_drills"
        ],
        "effects": {
          "abilityAdd": {
            "cooldown": -1.02,
            "count": 1
          }
        }
      },
      {
        "id": "summoner_guardian",
        "tier": 2,
        "name": "Guardian Rifles",
        "cost": 129,
        "description": "Improves ability.",
        "requires": [
          "summoner_drills"
        ],
        "effects": {
          "abilityAdd": {
            "summon": {
              "range": 25,
              "fireRate": 0.32
            }
          }
        }
      },
      {
        "id": "summoner_squad",
        "tier": 2,
        "name": "Extra Squad",
        "cost": 140,
        "description": "Improves ability.",
        "requires": [
          "summoner_muster"
        ],
        "effects": {
          "abilityAdd": {
            "count": 1,
            "summon": {
              "cap": 1
            }
          }
        }
      },
      {
        "id": "summoner_battalion",
        "tier": 3,
        "name": "Steel Battalion",
        "cost": 194,
        "description": "Improves ability.",
        "requires": [
          "summoner_guardian"
        ],
        "effects": {
          "abilityAdd": {
            "summon": {
              "hp": 53.1,
              "damage": 4.32,
              "onHitEffects": [
                {
                  "type": "bleed",
                  "magnitude": 3.15,
                  "duration": 3.15,
                  "tickEvery": 0.6,
                  "damageType": "physical"
                }
              ]
            }
          }
        }
      },
      {
        "id": "summoner_march",
        "tier": 3,
        "name": "Endless March",
        "cost": 200,
        "description": "Improves ability.",
        "requires": [
          "summoner_squad"
        ],
        "effects": {
          "abilityMul": {
            "cooldown": 0.745
          },
          "abilityAdd": {
            "count": 1,
            "summon": {
              "cap": 1
            }
          }
        }
      }
    ]
  },
  "dronebay": {
    "id": "dronebay",
    "name": "Drone Bay",
    "role": "summoner",
    "cost": 196,
    "color": "#38bdf8",
    "stats": {
      "range": 120,
      "fireRate": 0,
      "damage": 0,
      "damageType": "lightning",
      "projectileSpeed": 260,
      "ability": {
        "type": "summon",
        "name": "Deploy Drones",
        "cooldown": 8.4,
        "count": 1,
        "radius": 95,
        "summon": {
          "id": "arc_drone",
          "name": "Arc Drone",
          "hp": 47.2,
          "speed": 77.9,
          "range": 130,
          "fireRate": 1.29,
          "damage": 6.48,
          "damageType": "lightning",
          "projectileSpeed": 266,
          "radius": 7,
          "lifetime": 14.4,
          "chain": {
            "maxJumps": 1,
            "range": 63,
            "falloff": 0.76
          },
          "cap": 4
        }
      }
    },
    "upgrades": [
      {
        "id": "dronebay_overclock",
        "tier": 1,
        "name": "Overclocked Bays",
        "cost": 113,
        "description": "Improves ability.",
        "excludes": [
          "dronebay_voltaic"
        ],
        "effects": {
          "abilityAdd": {
            "cooldown": -1.02,
            "count": 1
          }
        }
      },
      {
        "id": "dronebay_voltaic",
        "tier": 1,
        "name": "Voltaic Core",
        "cost": 118,
        "description": "Improves ability.",
        "excludes": [
          "dronebay_overclock"
        ],
        "effects": {
          "abilityAdd": {
            "summon": {
              "damage": 3.24,
              "chain": {
                "range": 22.5
              }
            }
          }
        }
      },
      {
        "id": "dronebay_arcnet",
        "tier": 2,
        "name": "Arc Net",
        "cost": 145,
        "description": "Improves ability.",
        "requires": [
          "dronebay_voltaic"
        ],
        "effects": {
          "abilityAdd": {
            "summon": {
              "chain": {
                "maxJumps": 1,
                "range": 18
              }
            }
          }
        }
      },
      {
        "id": "dronebay_rapid",
        "tier": 2,
        "name": "Rapid Launch",
        "cost": 140,
        "description": "Improves ability.",
        "requires": [
          "dronebay_overclock"
        ],
        "effects": {
          "abilityAdd": {
            "summon": {
              "fireRate": 0.37,
              "speed": 11.4
            }
          }
        }
      },
      {
        "id": "dronebay_tempest",
        "tier": 3,
        "name": "Tempest Swarm",
        "cost": 205,
        "description": "Improves ability.",
        "requires": [
          "dronebay_arcnet"
        ],
        "effects": {
          "abilityAdd": {
            "count": 1,
            "summon": {
              "chain": {
                "maxJumps": 1,
                "falloff": 0.67
              },
              "cap": 1
            }
          }
        }
      },
      {
        "id": "dronebay_saturation",
        "tier": 3,
        "name": "Saturation Launch",
        "cost": 200,
        "description": "Improves ability.",
        "requires": [
          "dronebay_rapid"
        ],
        "effects": {
          "abilityMul": {
            "cooldown": 0.745
          },
          "abilityAdd": {
            "summon": {
              "lifetime": 3.6
            }
          }
        }
      }
    ]
  },
  "marshal": {
    "id": "marshal",
    "name": "Marshal Post",
    "role": "summoner",
    "cost": 207,
    "color": "#a3e635",
    "stats": {
      "range": 130,
      "fireRate": 0,
      "damage": 0,
      "damageType": "physical",
      "projectileSpeed": 240,
      "aura": {
        "radius": 110.4,
        "buffs": {
          "damageMul": 1.088,
          "fireRateMul": 1.055
        }
      },
      "ability": {
        "type": "summon",
        "name": "Call Squires",
        "cooldown": 10.08,
        "count": 1,
        "radius": 104.5,
        "summon": {
          "id": "squire",
          "name": "Squire",
          "hp": 61.36,
          "speed": 57,
          "range": 110,
          "fireRate": 1.01,
          "damage": 6.48,
          "damageType": "physical",
          "projectileSpeed": 218.5,
          "radius": 8,
          "lifetime": 18,
          "cap": 3
        }
      }
    },
    "upgrades": [
      {
        "id": "marshal_drill",
        "tier": 1,
        "name": "Drill Sergeants",
        "cost": 107,
        "description": "Stronger aura, Improves ability.",
        "excludes": [
          "marshal_barracks"
        ],
        "effects": {
          "auraAdd": {
            "buffs": {
              "damageMul": 1.09,
              "fireRateMul": 1.072
            }
          },
          "abilityAdd": {
            "summon": {
              "hp": 21.24,
              "damage": 2.16
            }
          }
        }
      },
      {
        "id": "marshal_barracks",
        "tier": 1,
        "name": "Expanded Barracks",
        "cost": 113,
        "description": "Improves ability.",
        "excludes": [
          "marshal_drill"
        ],
        "effects": {
          "abilityAdd": {
            "count": 1,
            "summon": {
              "cap": 1
            }
          }
        }
      },
      {
        "id": "marshal_banner",
        "tier": 2,
        "name": "Battle Standards",
        "cost": 140,
        "description": "Stronger aura.",
        "requires": [
          "marshal_drill"
        ],
        "effects": {
          "auraAdd": {
            "radius": 127.5
          }
        }
      },
      {
        "id": "marshal_sharpen",
        "tier": 2,
        "name": "Sharpened Blades",
        "cost": 145,
        "description": "Improves ability.",
        "requires": [
          "marshal_barracks"
        ],
        "effects": {
          "abilityAdd": {
            "summon": {
              "onHitEffects": [
                {
                  "type": "bleed",
                  "magnitude": 2.63,
                  "duration": 2.7,
                  "tickEvery": 0.6,
                  "damageType": "physical"
                }
              ]
            }
          }
        }
      },
      {
        "id": "marshal_command",
        "tier": 3,
        "name": "Commanding Presence",
        "cost": 200,
        "description": "Stronger aura, Improves ability.",
        "requires": [
          "marshal_banner"
        ],
        "effects": {
          "auraAdd": {
            "radius": 161.5
          },
          "abilityMul": {
            "cooldown": 0.788
          }
        }
      },
      {
        "id": "marshal_legion",
        "tier": 3,
        "name": "Legion Surge",
        "cost": 205,
        "description": "Improves ability.",
        "requires": [
          "marshal_sharpen"
        ],
        "effects": {
          "abilityAdd": {
            "count": 1,
            "summon": {
              "hp": 29.5,
              "damage": 2.16,
              "cap": 1
            }
          }
        }
      }
    ]
  }
};
