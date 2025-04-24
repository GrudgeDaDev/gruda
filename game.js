const tribes = {
    ironWill: { bonus: { health: 1 }, effect: 'Taunt if Silver card on field' },
    bloodForConquest: { bonus: { attack: 1 }, effect: 'Haste if Red card on field' },
    fabled: { bonus: { cost: -1 }, effect: '-1 mana per Purple card in hand (stacking, min 0)' },
    tribalWar: { bonus: { summon: { attack: 1, health: 1, taunt: true } }, effect: '+1 health if Orange card on field' }
};

const season0 = [
    { id: "0", name: "Grudge", type: "minion", attack: 1, health: 1, cost: 1, description: "The essence of vengeance.", backgroundImage: "https://i.imgur.com/grudge.png", tribe: null, rarity: null, uniqueId: null },
    { id: "001", name: "Stealth Drone", type: "minion", attack: 1, health: 1, cost: 1, description: "Stealth. Quick scouting unit.", backgroundImage: "https://i.imgur.com/zMFckYB.png", startingAmount: 2, tribe: null, rarity: null, uniqueId: null, stealth: true },
    { id: "002", name: "A Coward Priest", type: "minion", attack: 1, health: 1, cost: 1, description: "Restore 2 health to a friendly character on play.", backgroundImage: "https://i.imgur.com/DHS25YU.jpeg", startingAmount: 2, tribe: null, rarity: null, uniqueId: null, healing: 2 },
    { id: "003", name: "Starborn Light", type: "minion", attack: 1, health: 1, cost: 1, description: "Summon a 1/1 spirit on play.", backgroundImage: "https://i.imgur.com/AvsiFog.png", startingAmount: 2, tribe: null, rarity: null, uniqueId: null, summon: { attack: 1, health: 1 } },
    { id: "004", name: "Arcane Mystic", type: "minion", attack: 2, health: 3, cost: 2, description: "On play: Draw a card.", backgroundImage: "https://i.imgur.com/Enu1T7Y.png", startingAmount: 2, tribe: null, rarity: null, uniqueId: null, ability: "drawCard", drawCount: 1 },
    { id: "005", name: "Alpha Skiff", type: "minion", attack: 1, health: 2, cost: 2, description: "On play: Deal 2 damage to an enemy.", backgroundImage: "https://i.imgur.com/z1fbkXx.png", startingAmount: 2, tribe: null, rarity: null, uniqueId: null, ability: "dealDamage", damage: 2 },
    { id: "006", name: "Orcish Sniper", type: "minion", attack: 2, health: 1, cost: 2, description: "Rot: Kills any minion it damages.", backgroundImage: "https://i.imgur.com/nlkfMpI.png", startingAmount: 2, tribe: null, rarity: null, uniqueId: null, rot: true },
    { id: "007", name: "Mace Assassin", type: "minion", attack: 4, health: 2, cost: 3, description: "Double attack if first attack doesn't kill.", backgroundImage: "https://i.imgur.com/3SkE6VG.png", startingAmount: 2, tribe: null, rarity: null, uniqueId: null, doubleAttack: true },
    { id: "008", name: "Swarm Legion", type: "minion", attack: 3, health: 3, cost: 3, description: "On play: Give all allies +1 attack this turn.", backgroundImage: "https://i.imgur.com/Wn84v6I.png", startingAmount: 2, tribe: null, rarity: null, uniqueId: null, ability: "boostAttack", boostAttack: 1, duration: "thisTurn" },
    { id: "009", name: "Ethereal Phantom", type: "minion", attack: 2, health: 3, cost: 3, description: "Return to life with 1 HP once.", backgroundImage: "https://i.imgur.com/v0RBTiV.png", startingAmount: 2, tribe: null, rarity: null, uniqueId: null, returnToLife: true },
    { id: "010", name: "Crimson Shade", type: "minion", attack: 2, health: 3, cost: 3, description: "On play: Give self +2 health.", backgroundImage: "https://i.imgur.com/36iR3J8.png", startingAmount: 2, tribe: null, rarity: null, uniqueId: null, ability: "giveHP", healthBoost: 2 },
    // ... (remaining Season 0 cards with updated abilities)
    { id: "101", name: "Cataclysm", type: "spell", cost: 7, description: "Deal 5 damage to all minions.", backgroundImage: "https://i.imgur.com/cataclysm.png", startingAmount: 1, tribe: null, rarity: null, uniqueId: null, ability: "boardWipe", damage: 5, target: "all" },
    { id: "102", name: "Enemy Purge", type: "spell", cost: 8, description: "Deal 7 damage to all enemy minions.", backgroundImage: "https://i.imgur.com/purge.png", startingAmount: 1, tribe: null, rarity: null, uniqueId: null, ability: "boardWipe", damage: 7, target: "enemy" }
];

function loadPlayerDeck(slot) {
    const savedDecks = JSON.parse(localStorage.getItem('savedDecks') || '{"1": [], "2": [], "3": []}');
    const deck = savedDecks[slot]?.cards || [];
    return deck.map(card => ({
        ...card,
        uid: Math.random().toString(36).substr(2, 9),
        type: card.attack !== undefined ? 'minion' : 'spell',
        damage: card.damage || (card.description.includes('Deal') ? parseInt(card.description.match(/Deal (\d+)/)?.[1] || 0) : 0),
        healing: card.healing || (card.description.includes('Restore') ? parseInt(card.description.match(/Restore (\d+)/)?.[1] || 0) : 0),
        ability: card.description.includes('Draw') ? 'drawCard' : card.ability,
        drawCount: card.description.includes('Draw') ? parseInt(card.description.match(/Draw (\d+)/)?.[1] || 2) : 0
    }));
}

function shuffle(deck) {
    return deck.sort(() => Math.random() - 0.5);
}

const TCGGame = {
    setup: (ctx, setupData) => {
        const deck = shuffle(loadPlayerDeck(setupData.deckSlot || '1'));
        const initialHand = deck.splice(0, 5);
        return {
            players: {
                '0': {
                    health: 30,
                    mana: 1,
                    maxMana: 1,
                    deck,
                    hand: initialHand,
                    board: [],
                    graveyard: [],
                    swapsLeft: 2
                },
                '1': {
                    health: 30,
                    mana: 1,
                    maxMana: 1,
                    deck: shuffle(loadPlayerDeck(setupData.deckSlot || '1')),
                    hand: deck.splice(0, 5),
                    board: [],
                    graveyard: [],
                    swapsLeft: 2
                }
            },
            log: ["Game started!"],
            selectedMinion: null,
            gameOver: false,
            startingPhase: true
        };
    },

    turn: {
        moveLimit: 1,
        onBegin: (G, ctx) => {
            if (!G.startingPhase) {
                const player = G.players[ctx.currentPlayer];
                player.maxMana = Math.min(10, player.maxMana + 1);
                player.mana = player.maxMana;
                drawCards(G, ctx, ctx.currentPlayer, 1);
                player.board.forEach(minion => {
                    minion.exhausted = false;
                    minion.canAttack = true;
                    if (minion.card.healAll) {
                        player.board.forEach(m => {
                            m.card.health = Math.min(100, m.card.health + minion.card.healAll);
                            G.log.push(`${ctx.currentPlayer === '0' ? 'Player 1' : 'Player 2'}'s ${minion.card.name} heals all for ${minion.card.healAll}`);
                        });
                        player.health = Math.min(100, player.health + minion.card.healAll);
                    }
                });
            }
        }
    },

    moves: {
        swapCard: (G, ctx, cardIndex) => {
            const player = G.players[ctx.currentPlayer];
            if (!G.startingPhase || player.swapsLeft <= 0 || cardIndex < 0 || cardIndex >= player.hand.length) return;
            const card = player.hand[cardIndex];
            if (player.deck.length > 0) {
                const newCard = player.deck.shift();
                player.hand[cardIndex] = { ...newCard, uid: Math.random().toString(36).substr(2, 9) };
                player.deck.push(card);
                player.swapsLeft--;
                G.log.push(`${ctx.currentPlayer === '0' ? 'Player 1' : 'Player 2'} swaps ${card.name} for ${newCard.name}`);
            }
        },
        confirmDeck: (G, ctx) => {
            G.startingPhase = false;
            G.log.push(`${ctx.currentPlayer === '0' ? 'Player 1' : 'Player 2'} confirms deck`);
            ctx.events.endTurn();
        },
        playCard: (G, ctx, cardIndex, playerID) => {
            const player = G.players[playerID];
            if (cardIndex < 0 || cardIndex >= player.hand.length || G.startingPhase) return;
            const card = player.hand[cardIndex];
            let effectiveCost = card.cost;
            if (card.tribe === 'fabled') {
                effectiveCost = Math.max(0, card.cost - player.hand.filter(c => c.tribe === 'fabled').length);
            }
            if (player.mana < effectiveCost) {
                G.log.push(`Not enough mana to play ${card.name}`);
                return;
            }
            player.mana -= effectiveCost;
            player.hand.splice(cardIndex, 1);

            if (card.type === 'minion' && player.board.length < 7) {
                const minion = { card, exhausted: true, canAttack: false, hasAttacked: false, revived: false };
                player.board.push(minion);
                G.log.push(`${playerID === '0' ? 'Player 1' : 'Player 2'} plays ${card.name}`);

                // Tribe Effects
                if (card.tribe === 'ironWill' && player.board.some(m => m.card.rarity === 'silver')) {
                    minion.card.taunt = true;
                }
                if (card.tribe === 'bloodForConquest' && player.board.some(m => m.card.rarity === 'red')) {
                    minion.exhausted = false;
                    minion.canAttack = true;
                }
                if (card.tribe === 'tribalWar' && player.board.some(m => m.card.rarity === 'orange')) {
                    minion.card.health += 1;
                }
                if (card.tribe === 'tribalWar') {
                    player.board.push({ card: { attack: 1, health: 1, taunt: true, name: "Taunt Spirit", uid: Math.random().toString(36).substr(2, 9) }, exhausted: true, canAttack: false });
                }

                // Minion Abilities
                if (card.ability === 'dealDamage') {
                    const opponent = G.players[playerID === '0' ? '1' : '0'];
                    if (opponent.board.length > 0) {
                        const target = opponent.board[0];
                        target.card.health -= card.damage;
                        G.log.push(`${card.name} deals ${card.damage} damage to ${target.card.name}`);
                        if (target.card.health <= 0) {
                            opponent.board.shift();
                            opponent.graveyard.push(target.card);
                            G.log.push(`${target.card.name} is destroyed`);
                        }
                    } else {
                        opponent.health -= card.damage;
                        G.log.push(`${card.name} deals ${card.damage} damage to opponent`);
                    }
                } else if (card.ability === 'giveHP') {
                    minion.card.health += card.healthBoost;
                    G.log.push(`${card.name} gains ${card.healthBoost} health`);
                } else if (card.ability === 'summon') {
                    player.board.push({ card: { attack: card.summon.attack, health: card.summon.health, name: "Summoned Spirit", uid: Math.random().toString(36).substr(2, 9) }, exhausted: true, canAttack: false });
                    G.log.push(`${card.name} summons a ${card.summon.attack}/${card.summon.health} spirit`);
                } else if (card.ability === 'boostAttack') {
                    player.board.forEach(m => {
                        m.card.attack += card.boostAttack;
                        if (card.duration === 'thisTurn') {
                            m.tempAttackBoost = (m.tempAttackBoost || 0) + card.boostAttack;
                        }
                    });
                    G.log.push(`${card.name} gives all allies +${card.boostAttack} attack`);
                }
            } else if (card.type === 'spell') {
                if (card.ability === 'drawCard') {
                    drawCards(G, ctx, playerID, card.drawCount);
                    G.log.push(`${playerID === '0' ? 'Player 1' : 'Player 2'} draws ${card.drawCount} cards with ${card.name}`);
                } else if (card.ability === 'boardWipe') {
                    const opponent = G.players[playerID === '0' ? '1' : '0'];
                    if (card.target === 'all') {
                        player.board.forEach(m => m.card.health -= card.damage);
                        opponent.board.forEach(m => m.card.health -= card.damage);
                        G.log.push(`${card.name} deals ${card.damage} damage to all minions`);
                    } else if (card.target === 'enemy') {
                        opponent.board.forEach(m => m.card.health -= card.damage);
                        G.log.push(`${card.name} deals ${card.damage} damage to all enemy minions`);
                    }
                    player.board = player.board.filter(m => {
                        if (m.card.health <= 0) {
                            player.graveyard.push(m.card);
                            return false;
                        }
                        return true;
                    });
                    opponent.board = opponent.board.filter(m => {
                        if (m.card.health <= 0) {
                            opponent.graveyard.push(m.card);
                            return false;
                        }
                        return true;
                    });
                } else if (card.damage) {
                    const opponent = G.players[playerID === '0' ? '1' : '0'];
                    if (opponent.board.length > 0) {
                        const target = opponent.board[0];
                        target.card.health -= card.damage;
                        G.log.push(`${card.name} deals ${card.damage} damage to ${target.card.name}`);
                        if (target.card.health <= 0) {
                            opponent.board.shift();
                            opponent.graveyard.push(target.card);
                            G.log.push(`${target.card.name} is destroyed`);
                        }
                    } else {
                        opponent.health -= card.damage;
                        G.log.push(`${card.name} deals ${card.damage} damage to opponent`);
                    }
                } else if (card.healing) {
                    player.health = Math.min(100, player.health + card.healing);
                    G.log.push(`${playerID === '0' ? 'Player 1' : 'Player 2'} heals for ${card.healing} with ${card.name}`);
                }
                player.graveyard.push(card);
            }
        },
        selectMinion: (G, ctx, uid) => {
            const player = G.players[ctx.currentPlayer];
            const minion = player.board.find(m => m.card.uid === uid);
            if (minion && !minion.exhausted && minion.card.attack > 0 && !minion.card.stealth) {
                player.board.forEach(m => m.selected = m.card.uid === uid);
                G.selectedMinion = minion;
            }
        },
        attackMinion: (G, ctx, targetUid) => {
            const player = G.players[ctx.currentPlayer];
            const opponent = G.players[ctx.currentPlayer === '0' ? '1' : '0'];
            const selectedMinion = G.selectedMinion;
            if (!selectedMinion || selectedMinion.exhausted) return;
            const targetMinion = opponent.board.find(m => m.card.uid === targetUid);
            if (!targetMinion || (opponent.board.some(m => m.card.taunt && !m.card.stealth) && !targetMinion.card.taunt)) return;
            if (targetMinion.card.stealth && !targetMinion.hasAttacked) return;

            targetMinion.card.health -= selectedMinion.card.attack;
            selectedMinion.card.health -= targetMinion.card.attack;
            selectedMinion.exhausted = true;
            selectedMinion.canAttack = false;
            selectedMinion.hasAttacked = true;
            targetMinion.hasAttacked = true;
            G.log.push(`${ctx.currentPlayer === '0' ? 'Player 1' : 'Player 2'}'s ${selectedMinion.card.name} attacks ${targetMinion.card.name}`);

            if (selectedMinion.card.rot && targetMinion.card.health > 0) {
                targetMinion.card.health = 0;
                G.log.push(`${selectedMinion.card.name}'s Rot destroys ${targetMinion.card.name}`);
            }
            if (selectedMinion.card.doubleAttack && targetMinion.card.health > 0) {
                targetMinion.card.health -= selectedMinion.card.attack;
                G.log.push(`${selectedMinion.card.name} attacks again for ${selectedMinion.card.attack}`);
            }

            if (targetMinion.card.health <= 0) {
                opponent.board = opponent.board.filter(m => m.card.uid !== targetUid);
                opponent.graveyard.push(targetMinion.card);
                G.log.push(`${targetMinion.card.name} is destroyed`);
                if (targetMinion.card.returnToLife && !targetMinion.revived) {
                    opponent.board.push({ card: { ...targetMinion.card, health: 1 }, exhausted: true, canAttack: false, revived: true });
                    G.log.push(`${targetMinion.card.name} returns to life with 1 HP`);
                }
            }
            if (selectedMinion.card.health <= 0) {
                player.board = player.board.filter(m => m.card.uid !== selectedMinion.card.uid);
                player.graveyard.push(selectedMinion.card);
                G.log.push(`${selectedMinion.card.name} is destroyed`);
                if (selectedMinion.card.returnToLife && !selectedMinion.revived) {
                    player.board.push({ card: { ...selectedMinion.card, health: 1 }, exhausted: true, canAttack: false, revived: true });
                    G.log.push(`${selectedMinion.card.name} returns to life with 1 HP`);
                }
            }
            G.selectedMinion = null;
            player.board.forEach(m => m.selected = false);
        },
        attackHero: (G, ctx, opponentID) => {
            const player = G.players[ctx.currentPlayer];
            const opponent = G.players[opponentID];
            const selectedMinion = G.selectedMinion;
            if (!selectedMinion || selectedMinion.exhausted || opponent.board.some(m => m.card.taunt && !m.card.stealth)) return;
            opponent.health -= selectedMinion.card.attack;
            selectedMinion.exhausted = true;
            selectedMinion.canAttack = false;
            selectedMinion.hasAttacked = true;
            G.log.push(`${ctx.currentPlayer === '0' ? 'Player 1' : 'Player 2'}'s ${selectedMinion.card.name} attacks opponent hero for ${selectedMinion.card.attack}`);
            G.selectedMinion = null;
            player.board.forEach(m => m.selected = false);
        },
        endTurn: (G, ctx) => {
            const player = G.players[ctx.currentPlayer];
            player.board.forEach(m => {
                if (m.tempAttackBoost) {
                    m.card.attack -= m.tempAttackBoost;
                    m.tempAttackBoost = 0;
                }
            });
            ctx.events.endTurn();
            G.selectedMinion = null;
            player.board.forEach(m => m.selected = false);
            G.log.push(`${ctx.currentPlayer === '0' ? 'Player 1' : 'Player 2'} ends turn`);
        }
    },

    endIf: (G, ctx) => {
        if (G.players['0'].health <= 0) return { winner: '1', gameOver: true };
        if (G.players['1'].health <= 0) return { winner: '0', gameOver: true };
    }
};

function drawCards(G, ctx, playerID, count) {
    const player = G.players[playerID];
    for (let i = 0; i < count && player.deck.length > 0 && player.hand.length < 10; i++) {
        const card = player.deck.shift();
        player.hand.push(card);
        G.log.push(`${playerID === '0' ? 'Player 1' : 'Player 2'} draws ${card.name}`);
    }
    if (player.deck.length === 0 && player.hand.length < count) {
        player.health -= Math.ceil(ctx.turn / 2);
        G.log.push(`${playerID === '0' ? 'Player 1' : 'Player 2'} takes ${Math.ceil(ctx.turn / 2)} fatigue damage`);
    }
}

export { TCGGame };