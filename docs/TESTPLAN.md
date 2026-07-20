# 0.6.7.1 Test Plan

1. Start the game and confirm the active character displays Level 1 and 0 / 100 XP.
2. Kill one normal enemy and confirm every current character receives 18 XP.
3. Kill an elite and confirm every character receives 40 XP.
4. Kill a boss and confirm every character receives 100 XP.
5. Complete an encounter and confirm every character receives 75 XP.
6. Complete The Wolf Problem and confirm every character receives 125 XP once.
7. Use Developer HUD → Progression → Grant 500 XP.
8. Confirm multiple level gains consume XP correctly and retain overflow.
9. Confirm health and attack values increase after leveling.
10. Swap active characters and confirm the XP HUD displays the selected character.
11. Export and re-import progression through `astralEngineAlpha.exportProgression()` and `importProgression()`.
12. Confirm no XP is granted twice from the same quest state transition.
