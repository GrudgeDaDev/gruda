class Card:
    def __init__(self, data):
        self.id = data['cardId']
        self.name = data['name']
        self.type = data['type']
        self.base_atk = data['atk'] if 'atk' in data else 0
        self.base_hp = data['hp'] if 'hp' in data else 0
        self.base_cost = data['cost']
        self.description = data['description']
        self.image = data['image']
        self.tribe = data.get('tribe', '')  # Default to empty string if not provided
        self.special_trait = data.get('specialTrait', '')
        self.starting_amount = data['startingAmount']
        
        # Initialize adjusted stats
        self.atk = self.base_atk
        self.hp = self.base_hp
        self.cost = self.base_cost
        
        # Apply base tribal effects (assuming listed stats are "normal")
        if self.tribe == 'silver':
            self.hp += 1  # Iron Will: +1 health
        elif self.tribe == 'red':
            self.atk += 1  # Blood For Conquest: +1 attack
        elif self.tribe == 'purple':
            self.cost = max(0, self.cost - 1)  # Fabled: Cost one less mana
        # Orange base effect (summon 1/1 with Taunt) is applied when played

    def get_effective_cost(self, hand):
        """Calculate effective cost, accounting for Purple tribal effect."""
        if self.tribe == 'purple':
            purple_in_hand = sum(1 for card in hand if card.tribe == 'purple' and card != self)
            return max(0, self.cost - purple_in_hand)  # Further reduce by other Purples in hand
        return self.cost

    def play(self, battlefield, hand):
        """Simulate playing the card and applying tribal effects."""
        effects = {}
        
        if self.type == 'minion':
            # Add to battlefield (simplified as a list append)
            battlefield.append(self)
            
            # Apply tribal effects
            if self.tribe == 'silver':
                # Iron Will: Gain Taunt if another Silver is on field
                if any(card.tribe == 'silver' and card != self for card in battlefield):
                    effects['taunt'] = True
            
            elif self.tribe == 'red':
                # Blood For Conquest: Gain Haste if another Red is on field
                if any(card.tribe == 'red' and card != self for card in battlefield):
                    effects['haste'] = True
            
            elif self.tribe == 'orange':
                # Tribal War: Summon a 1/1 with Taunt
                summoned = Card({
                    'cardId': 'summoned_001',
                    'name': 'Taunt Minion',
                    'type': 'minion',
                    'atk': 1,
                    'hp': 1,
                    'cost': 0,
                    'description': 'Summoned with Taunt',
                    'tribe': '',
                    'startingAmount': 0
                })
                summoned.effects = {'taunt': True}
                battlefield.append(summoned)
                # If another Orange is on field, all Orange cards gain +1 health
                if any(card.tribe == 'orange' and card != self for card in battlefield):
                    for card in battlefield:
                        if card.tribe == 'orange':
                            card.hp += 1
                            effects.setdefault('health_boost', []).append(card.name)
        
        return effects

# Example usage with sample data and tribe assignments
card_data = [
    {"cardId": "001", "name": "Stealth Drone", "type": "minion", "atk": 1, "hp": 1, "cost": 1, "description": "Quick scouting unit cloaked in shadow.", "image": "https://i.imgur.com/zMFckYB.png", "startingAmount": 2, "tribe": "purple"},  # Assigned Purple for stealth/tempo
    {"cardId": "007", "name": "Mace Assassin", "type": "minion", "atk": 4, "hp": 2, "cost": 3, "description": "Strikes with venomous precision.", "image": "https://i.imgur.com/3SkE6VG.png", "startingAmount": 2, "tribe": "red"},  # Assigned Red for aggression
    {"cardId": "024", "name": "Barrier Sentinel", "type": "minion", "atk": 0, "hp": 7, "cost": 5, "description": "Unyielding defense with Taunt.", "image": "https://i.imgur.com/klAa6aX.png", "startingAmount": 1, "tribe": "silver"},  # Assigned Silver for defense
    {"cardId": "008", "name": "Swarm Legion", "type": "minion", "atk": 3, "hp": 3, "cost": 3, "description": "Overruns the enemy in numbers.", "image": "https://i.imgur.com/Wn84v6I.png", "startingAmount": 2, "tribe": "orange"}  # Assigned Orange for swarming
]

# Create card instances
cards = [Card(data) for data in card_data]
battlefield = []
hand = cards[:2]  # First two cards in hand

# Test playing cards
for card in cards:
    print(f"Playing {card.name} (Tribe: {card.tribe})")
    effects = card.play(battlefield, hand)
    print(f"Base Stats - ATK: {card.atk}, HP: {card.hp}, Cost: {card.get_effective_cost(hand)}")
    if effects:
        print(f"Effects Applied: {effects}")
    print(f"Battlefield: {[c.name for c in battlefield]}\n")