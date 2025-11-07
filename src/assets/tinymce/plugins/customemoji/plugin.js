/**
 * Custom Emoji Plugin for TinyMCE
 * Browser-compatible emoji picker using Unicode emojis with categories
 */

(function() {
    'use strict';

    // Emoji groups with icons and localized names
    var emojiGroups = [
        {
            id: 'smileys',
            icon: '😀',
            nameEn: 'Smileys & Emotion',
            nameDe: 'Smileys & Emotionen',
            nameHr: 'Smješkići i emocije',
            emojis: [
                { emoji: '😀', name: 'Grinning Face' },
                { emoji: '😃', name: 'Grinning Face with Big Eyes' },
                { emoji: '😄', name: 'Grinning Face with Smiling Eyes' },
                { emoji: '😁', name: 'Beaming Face with Smiling Eyes' },
                { emoji: '😆', name: 'Grinning Squinting Face' },
                { emoji: '😅', name: 'Grinning Face with Sweat' },
                { emoji: '🤣', name: 'Rolling on the Floor Laughing' },
                { emoji: '😂', name: 'Face with Tears of Joy' },
                { emoji: '🙂', name: 'Slightly Smiling Face' },
                { emoji: '🙃', name: 'Upside-Down Face' },
                { emoji: '😉', name: 'Winking Face' },
                { emoji: '😊', name: 'Smiling Face with Smiling Eyes' },
                { emoji: '😇', name: 'Smiling Face with Halo' },
                { emoji: '🥰', name: 'Smiling Face with Hearts' },
                { emoji: '😍', name: 'Smiling Face with Heart-Eyes' },
                { emoji: '🤩', name: 'Star-Struck' },
                { emoji: '😘', name: 'Face Blowing a Kiss' },
                { emoji: '😗', name: 'Kissing Face' },
                { emoji: '😚', name: 'Kissing Face with Closed Eyes' },
                { emoji: '😙', name: 'Kissing Face with Smiling Eyes' },
                { emoji: '🥲', name: 'Smiling Face with Tear' },
                { emoji: '😋', name: 'Face Savoring Food' },
                { emoji: '😛', name: 'Face with Tongue' },
                { emoji: '😜', name: 'Winking Face with Tongue' },
                { emoji: '🤪', name: 'Zany Face' },
                { emoji: '😝', name: 'Squinting Face with Tongue' },
                { emoji: '🤑', name: 'Money-Mouth Face' },
                { emoji: '🤗', name: 'Smiling Face with Open Hands' },
                { emoji: '🤭', name: 'Face with Hand Over Mouth' },
                { emoji: '🤫', name: 'Shushing Face' },
                { emoji: '🤔', name: 'Thinking Face' },
                { emoji: '🤐', name: 'Zipper-Mouth Face' },
                { emoji: '🤨', name: 'Face with Raised Eyebrow' },
                { emoji: '😐', name: 'Neutral Face' },
                { emoji: '😑', name: 'Expressionless Face' },
                { emoji: '😶', name: 'Face Without Mouth' },
                { emoji: '😏', name: 'Smirking Face' },
                { emoji: '😒', name: 'Unamused Face' },
                { emoji: '🙄', name: 'Face with Rolling Eyes' },
                { emoji: '😬', name: 'Grimacing Face' },
                { emoji: '🤥', name: 'Lying Face' },
                { emoji: '😌', name: 'Relieved Face' },
                { emoji: '😔', name: 'Pensive Face' },
                { emoji: '😪', name: 'Sleepy Face' },
                { emoji: '🤤', name: 'Drooling Face' },
                { emoji: '😴', name: 'Sleeping Face' },
                { emoji: '😷', name: 'Face with Medical Mask' },
                { emoji: '🤒', name: 'Face with Thermometer' },
                { emoji: '🤕', name: 'Face with Head-Bandage' },
                { emoji: '🤢', name: 'Nauseated Face' },
                { emoji: '🤮', name: 'Face Vomiting' },
                { emoji: '🤧', name: 'Sneezing Face' },
                { emoji: '🥵', name: 'Hot Face' },
                { emoji: '🥶', name: 'Cold Face' },
                { emoji: '🥴', name: 'Woozy Face' },
                { emoji: '😵', name: 'Face with Crossed-Out Eyes' },
                { emoji: '🤯', name: 'Exploding Head' },
                { emoji: '🤠', name: 'Cowboy Hat Face' },
                { emoji: '🥳', name: 'Partying Face' },
                { emoji: '🥸', name: 'Disguised Face' },
                { emoji: '😎', name: 'Smiling Face with Sunglasses' },
                { emoji: '🤓', name: 'Nerd Face' },
                { emoji: '🧐', name: 'Face with Monocle' },
                { emoji: '😕', name: 'Confused Face' },
                { emoji: '😟', name: 'Worried Face' },
                { emoji: '🙁', name: 'Slightly Frowning Face' },
                { emoji: '☹️', name: 'Frowning Face' },
                { emoji: '😮', name: 'Face with Open Mouth' },
                { emoji: '😯', name: 'Hushed Face' },
                { emoji: '😲', name: 'Astonished Face' },
                { emoji: '😳', name: 'Flushed Face' },
                { emoji: '🥺', name: 'Pleading Face' },
                { emoji: '😦', name: 'Frowning Face with Open Mouth' },
                { emoji: '😧', name: 'Anguished Face' },
                { emoji: '😨', name: 'Fearful Face' },
                { emoji: '😰', name: 'Anxious Face with Sweat' },
                { emoji: '😥', name: 'Sad but Relieved Face' },
                { emoji: '😢', name: 'Crying Face' },
                { emoji: '😭', name: 'Loudly Crying Face' },
                { emoji: '😱', name: 'Face Screaming in Fear' },
                { emoji: '😖', name: 'Confounded Face' },
                { emoji: '😣', name: 'Persevering Face' },
                { emoji: '😞', name: 'Disappointed Face' },
                { emoji: '😓', name: 'Downcast Face with Sweat' },
                { emoji: '😩', name: 'Weary Face' },
                { emoji: '😫', name: 'Tired Face' },
                { emoji: '🥱', name: 'Yawning Face' },
                { emoji: '😤', name: 'Face with Steam From Nose' },
                { emoji: '😡', name: 'Enraged Face' },
                { emoji: '😠', name: 'Angry Face' },
                { emoji: '🤬', name: 'Face with Symbols on Mouth' },
                { emoji: '😈', name: 'Smiling Face with Horns' },
                { emoji: '👿', name: 'Angry Face with Horns' },
                { emoji: '💀', name: 'Skull' },
                { emoji: '☠️', name: 'Skull and Crossbones' },
                { emoji: '💩', name: 'Pile of Poo' },
                { emoji: '🤡', name: 'Clown Face' },
                { emoji: '👹', name: 'Ogre' },
                { emoji: '👺', name: 'Goblin' },
                { emoji: '👻', name: 'Ghost' },
                { emoji: '👽', name: 'Alien' },
                { emoji: '👾', name: 'Alien Monster' },
                { emoji: '🤖', name: 'Robot' },
                { emoji: '😺', name: 'Grinning Cat' },
                { emoji: '😸', name: 'Grinning Cat with Smiling Eyes' },
                { emoji: '😹', name: 'Cat with Tears of Joy' },
                { emoji: '😻', name: 'Smiling Cat with Heart-Eyes' },
                { emoji: '😼', name: 'Cat with Wry Smile' },
                { emoji: '😽', name: 'Kissing Cat' },
                { emoji: '🙀', name: 'Weary Cat' },
                { emoji: '😿', name: 'Crying Cat' },
                { emoji: '😾', name: 'Pouting Cat' }
            ]
        },
        {
            id: 'gestures',
            icon: '👋',
            nameEn: 'Gestures & Body Parts',
            nameDe: 'Gesten & Körperteile',
            nameHr: 'Geste i dijelovi tijela',
            emojis: [
                { emoji: '👋', name: 'Waving Hand' },
                { emoji: '🤚', name: 'Raised Back of Hand' },
                { emoji: '🖐️', name: 'Hand with Fingers Splayed' },
                { emoji: '✋', name: 'Raised Hand' },
                { emoji: '🖖', name: 'Vulcan Salute' },
                { emoji: '👌', name: 'OK Hand' },
                { emoji: '🤌', name: 'Pinched Fingers' },
                { emoji: '🤏', name: 'Pinching Hand' },
                { emoji: '✌️', name: 'Victory Hand' },
                { emoji: '🤞', name: 'Crossed Fingers' },
                { emoji: '🤟', name: 'Love-You Gesture' },
                { emoji: '🤘', name: 'Sign of the Horns' },
                { emoji: '🤙', name: 'Call Me Hand' },
                { emoji: '👈', name: 'Backhand Index Pointing Left' },
                { emoji: '👉', name: 'Backhand Index Pointing Right' },
                { emoji: '👆', name: 'Backhand Index Pointing Up' },
                { emoji: '🖕', name: 'Middle Finger' },
                { emoji: '👇', name: 'Backhand Index Pointing Down' },
                { emoji: '☝️', name: 'Index Pointing Up' },
                { emoji: '👍', name: 'Thumbs Up' },
                { emoji: '👎', name: 'Thumbs Down' },
                { emoji: '✊', name: 'Raised Fist' },
                { emoji: '👊', name: 'Oncoming Fist' },
                { emoji: '🤛', name: 'Left-Facing Fist' },
                { emoji: '🤜', name: 'Right-Facing Fist' },
                { emoji: '👏', name: 'Clapping Hands' },
                { emoji: '🙌', name: 'Raising Hands' },
                { emoji: '👐', name: 'Open Hands' },
                { emoji: '🤲', name: 'Palms Up Together' },
                { emoji: '🤝', name: 'Handshake' },
                { emoji: '🙏', name: 'Folded Hands' },
                { emoji: '✍️', name: 'Writing Hand' },
                { emoji: '💅', name: 'Nail Polish' },
                { emoji: '🤳', name: 'Selfie' },
                { emoji: '💪', name: 'Flexed Biceps' }
            ]
        },
        {
            id: 'animals',
            icon: '🐶',
            nameEn: 'Animals & Nature',
            nameDe: 'Tiere & Natur',
            nameHr: 'Životinje i priroda',
            emojis: [
                { emoji: '🐶', name: 'Dog Face' },
                { emoji: '🐱', name: 'Cat Face' },
                { emoji: '🐭', name: 'Mouse Face' },
                { emoji: '🐹', name: 'Hamster' },
                { emoji: '🐰', name: 'Rabbit Face' },
                { emoji: '🦊', name: 'Fox' },
                { emoji: '🐻', name: 'Bear' },
                { emoji: '🐼', name: 'Panda' },
                { emoji: '🐨', name: 'Koala' },
                { emoji: '🐯', name: 'Tiger Face' },
                { emoji: '🦁', name: 'Lion' },
                { emoji: '🐮', name: 'Cow Face' },
                { emoji: '🐷', name: 'Pig Face' },
                { emoji: '🐽', name: 'Pig Nose' },
                { emoji: '🐸', name: 'Frog' },
                { emoji: '🐵', name: 'Monkey Face' },
                { emoji: '🙈', name: 'See-No-Evil Monkey' },
                { emoji: '🙉', name: 'Hear-No-Evil Monkey' },
                { emoji: '🙊', name: 'Speak-No-Evil Monkey' },
                { emoji: '🐒', name: 'Monkey' },
                { emoji: '🐔', name: 'Chicken' },
                { emoji: '🐧', name: 'Penguin' },
                { emoji: '🐦', name: 'Bird' },
                { emoji: '🐤', name: 'Baby Chick' },
                { emoji: '🐣', name: 'Hatching Chick' },
                { emoji: '🐥', name: 'Front-Facing Baby Chick' },
                { emoji: '🦆', name: 'Duck' },
                { emoji: '🦅', name: 'Eagle' },
                { emoji: '🦉', name: 'Owl' },
                { emoji: '🦇', name: 'Bat' },
                { emoji: '🐺', name: 'Wolf' },
                { emoji: '🐗', name: 'Boar' },
                { emoji: '🐴', name: 'Horse Face' },
                { emoji: '🦄', name: 'Unicorn' },
                { emoji: '🐝', name: 'Honeybee' },
                { emoji: '🐛', name: 'Bug' },
                { emoji: '🦋', name: 'Butterfly' },
                { emoji: '🐌', name: 'Snail' },
                { emoji: '🐞', name: 'Lady Beetle' },
                { emoji: '🐜', name: 'Ant' },
                { emoji: '🦟', name: 'Mosquito' },
                { emoji: '🐢', name: 'Turtle' },
                { emoji: '🐍', name: 'Snake' },
                { emoji: '🦎', name: 'Lizard' },
                { emoji: '🦖', name: 'T-Rex' },
                { emoji: '🦕', name: 'Sauropod' },
                { emoji: '🐙', name: 'Octopus' },
                { emoji: '🦑', name: 'Squid' },
                { emoji: '🦐', name: 'Shrimp' },
                { emoji: '🦞', name: 'Lobster' },
                { emoji: '🦀', name: 'Crab' },
                { emoji: '🐡', name: 'Blowfish' },
                { emoji: '🐠', name: 'Tropical Fish' },
                { emoji: '🐟', name: 'Fish' },
                { emoji: '🐬', name: 'Dolphin' },
                { emoji: '🐳', name: 'Spouting Whale' },
                { emoji: '🐋', name: 'Whale' },
                { emoji: '🦈', name: 'Shark' },
                { emoji: '🐊', name: 'Crocodile' }
            ]
        },
        {
            id: 'food',
            icon: '🍕',
            nameEn: 'Food & Drink',
            nameDe: 'Essen & Trinken',
            nameHr: 'Hrana i piće',
            emojis: [
                { emoji: '🍏', name: 'Green Apple' },
                { emoji: '🍎', name: 'Red Apple' },
                { emoji: '🍐', name: 'Pear' },
                { emoji: '🍊', name: 'Tangerine' },
                { emoji: '🍋', name: 'Lemon' },
                { emoji: '🍌', name: 'Banana' },
                { emoji: '🍉', name: 'Watermelon' },
                { emoji: '🍇', name: 'Grapes' },
                { emoji: '🍓', name: 'Strawberry' },
                { emoji: '🍈', name: 'Melon' },
                { emoji: '🍒', name: 'Cherries' },
                { emoji: '🍑', name: 'Peach' },
                { emoji: '🥭', name: 'Mango' },
                { emoji: '🍍', name: 'Pineapple' },
                { emoji: '🥥', name: 'Coconut' },
                { emoji: '🥝', name: 'Kiwi Fruit' },
                { emoji: '🍅', name: 'Tomato' },
                { emoji: '🍆', name: 'Eggplant' },
                { emoji: '🥑', name: 'Avocado' },
                { emoji: '🥦', name: 'Broccoli' },
                { emoji: '🥒', name: 'Cucumber' },
                { emoji: '🌶️', name: 'Hot Pepper' },
                { emoji: '🌽', name: 'Ear of Corn' },
                { emoji: '🥕', name: 'Carrot' },
                { emoji: '🥔', name: 'Potato' },
                { emoji: '🍞', name: 'Bread' },
                { emoji: '🥖', name: 'Baguette Bread' },
                { emoji: '🧀', name: 'Cheese Wedge' },
                { emoji: '🥚', name: 'Egg' },
                { emoji: '🍳', name: 'Cooking' },
                { emoji: '🥓', name: 'Bacon' },
                { emoji: '🍗', name: 'Poultry Leg' },
                { emoji: '🍖', name: 'Meat on Bone' },
                { emoji: '🌭', name: 'Hot Dog' },
                { emoji: '🍔', name: 'Hamburger' },
                { emoji: '🍟', name: 'French Fries' },
                { emoji: '🍕', name: 'Pizza' },
                { emoji: '🥪', name: 'Sandwich' },
                { emoji: '🌮', name: 'Taco' },
                { emoji: '🌯', name: 'Burrito' },
                { emoji: '🥗', name: 'Green Salad' },
                { emoji: '🍝', name: 'Spaghetti' },
                { emoji: '🍜', name: 'Steaming Bowl' },
                { emoji: '🍲', name: 'Pot of Food' },
                { emoji: '🍛', name: 'Curry Rice' },
                { emoji: '🍣', name: 'Sushi' },
                { emoji: '🍱', name: 'Bento Box' },
                { emoji: '🥟', name: 'Dumpling' },
                { emoji: '🍤', name: 'Fried Shrimp' },
                { emoji: '🍙', name: 'Rice Ball' },
                { emoji: '🍚', name: 'Cooked Rice' },
                { emoji: '🍧', name: 'Shaved Ice' },
                { emoji: '🍨', name: 'Ice Cream' },
                { emoji: '🍦', name: 'Soft Ice Cream' },
                { emoji: '🥧', name: 'Pie' },
                { emoji: '🧁', name: 'Cupcake' },
                { emoji: '🍰', name: 'Shortcake' },
                { emoji: '🎂', name: 'Birthday Cake' },
                { emoji: '🍮', name: 'Custard' },
                { emoji: '🍭', name: 'Lollipop' },
                { emoji: '🍬', name: 'Candy' },
                { emoji: '🍫', name: 'Chocolate Bar' },
                { emoji: '🍿', name: 'Popcorn' },
                { emoji: '🍩', name: 'Doughnut' },
                { emoji: '🍪', name: 'Cookie' },
                { emoji: '🥛', name: 'Glass of Milk' },
                { emoji: '☕', name: 'Hot Beverage' },
                { emoji: '🍵', name: 'Teacup Without Handle' },
                { emoji: '🍶', name: 'Sake' },
                { emoji: '🍾', name: 'Bottle with Popping Cork' },
                { emoji: '🍷', name: 'Wine Glass' },
                { emoji: '🍸', name: 'Cocktail Glass' },
                { emoji: '🍹', name: 'Tropical Drink' },
                { emoji: '🍺', name: 'Beer Mug' },
                { emoji: '🍻', name: 'Clinking Beer Mugs' },
                { emoji: '🥂', name: 'Clinking Glasses' },
                { emoji: '🥃', name: 'Tumbler Glass' }
            ]
        },
        {
            id: 'activities',
            icon: '⚽',
            nameEn: 'Activities & Sports',
            nameDe: 'Aktivitäten & Sport',
            nameHr: 'Aktivnosti i sport',
            emojis: [
                { emoji: '⚽', name: 'Soccer Ball' },
                { emoji: '🏀', name: 'Basketball' },
                { emoji: '🏈', name: 'American Football' },
                { emoji: '⚾', name: 'Baseball' },
                { emoji: '🎾', name: 'Tennis' },
                { emoji: '🏐', name: 'Volleyball' },
                { emoji: '🏉', name: 'Rugby Football' },
                { emoji: '🎱', name: 'Pool 8 Ball' },
                { emoji: '🏓', name: 'Ping Pong' },
                { emoji: '🏸', name: 'Badminton' },
                { emoji: '🥅', name: 'Goal Net' },
                { emoji: '🏒', name: 'Ice Hockey' },
                { emoji: '🏑', name: 'Field Hockey' },
                { emoji: '🏏', name: 'Cricket Game' },
                { emoji: '⛳', name: 'Flag in Hole' },
                { emoji: '🏹', name: 'Bow and Arrow' },
                { emoji: '🎣', name: 'Fishing Pole' },
                { emoji: '🥊', name: 'Boxing Glove' },
                { emoji: '🥋', name: 'Martial Arts Uniform' },
                { emoji: '🎽', name: 'Running Shirt' },
                { emoji: '🛹', name: 'Skateboard' },
                { emoji: '🛼', name: 'Roller Skate' },
                { emoji: '🛷', name: 'Sled' },
                { emoji: '⛸️', name: 'Ice Skate' },
                { emoji: '🥌', name: 'Curling Stone' },
                { emoji: '🎿', name: 'Skis' },
                { emoji: '⛷️', name: 'Skier' },
                { emoji: '🏂', name: 'Snowboarder' },
                { emoji: '🏋️', name: 'Person Lifting Weights' },
                { emoji: '🤼', name: 'People Wrestling' },
                { emoji: '🤸', name: 'Person Cartwheeling' },
                { emoji: '⛹️', name: 'Person Bouncing Ball' },
                { emoji: '🤺', name: 'Person Fencing' },
                { emoji: '🤾', name: 'Person Playing Handball' },
                { emoji: '🏌️', name: 'Person Golfing' },
                { emoji: '🏇', name: 'Horse Racing' },
                { emoji: '🧘', name: 'Person in Lotus Position' },
                { emoji: '🏄', name: 'Person Surfing' },
                { emoji: '🏊', name: 'Person Swimming' },
                { emoji: '🤽', name: 'Person Playing Water Polo' },
                { emoji: '🚣', name: 'Person Rowing Boat' },
                { emoji: '🧗', name: 'Person Climbing' },
                { emoji: '🚵', name: 'Person Mountain Biking' },
                { emoji: '🚴', name: 'Person Biking' },
                { emoji: '🏆', name: 'Trophy' },
                { emoji: '🥇', name: '1st Place Medal' },
                { emoji: '🥈', name: '2nd Place Medal' },
                { emoji: '🥉', name: '3rd Place Medal' },
                { emoji: '🏅', name: 'Sports Medal' },
                { emoji: '🎖️', name: 'Military Medal' }
            ]
        },
        {
            id: 'travel',
            icon: '✈️',
            nameEn: 'Travel & Places',
            nameDe: 'Reisen & Orte',
            nameHr: 'Putovanja i mjesta',
            emojis: [
                { emoji: '🚗', name: 'Automobile' },
                { emoji: '🚕', name: 'Taxi' },
                { emoji: '🚙', name: 'Sport Utility Vehicle' },
                { emoji: '🚌', name: 'Bus' },
                { emoji: '🚎', name: 'Trolleybus' },
                { emoji: '🏎️', name: 'Racing Car' },
                { emoji: '🚓', name: 'Police Car' },
                { emoji: '🚑', name: 'Ambulance' },
                { emoji: '🚒', name: 'Fire Engine' },
                { emoji: '🚐', name: 'Minibus' },
                { emoji: '🚚', name: 'Delivery Truck' },
                { emoji: '🚛', name: 'Articulated Lorry' },
                { emoji: '🚜', name: 'Tractor' },
                { emoji: '🏍️', name: 'Motorcycle' },
                { emoji: '🛵', name: 'Motor Scooter' },
                { emoji: '🚲', name: 'Bicycle' },
                { emoji: '🛴', name: 'Kick Scooter' },
                { emoji: '🚏', name: 'Bus Stop' },
                { emoji: '🛣️', name: 'Motorway' },
                { emoji: '⛽', name: 'Fuel Pump' },
                { emoji: '🚨', name: 'Police Car Light' },
                { emoji: '🚥', name: 'Horizontal Traffic Light' },
                { emoji: '🚦', name: 'Vertical Traffic Light' },
                { emoji: '🛑', name: 'Stop Sign' },
                { emoji: '🚧', name: 'Construction' },
                { emoji: '⚓', name: 'Anchor' },
                { emoji: '⛵', name: 'Sailboat' },
                { emoji: '🛶', name: 'Canoe' },
                { emoji: '🚤', name: 'Speedboat' },
                { emoji: '🛳️', name: 'Passenger Ship' },
                { emoji: '⛴️', name: 'Ferry' },
                { emoji: '🚢', name: 'Ship' },
                { emoji: '✈️', name: 'Airplane' },
                { emoji: '🛩️', name: 'Small Airplane' },
                { emoji: '🛫', name: 'Airplane Departure' },
                { emoji: '🛬', name: 'Airplane Arrival' },
                { emoji: '💺', name: 'Seat' },
                { emoji: '🚁', name: 'Helicopter' },
                { emoji: '🚟', name: 'Suspension Railway' },
                { emoji: '🚠', name: 'Mountain Cableway' },
                { emoji: '🚡', name: 'Aerial Tramway' },
                { emoji: '🛰️', name: 'Satellite' },
                { emoji: '🚀', name: 'Rocket' },
                { emoji: '🛸', name: 'Flying Saucer' }
            ]
        },
        {
            id: 'objects',
            icon: '💡',
            nameEn: 'Objects',
            nameDe: 'Objekte',
            nameHr: 'Objekti',
            emojis: [
                { emoji: '⌚', name: 'Watch' },
                { emoji: '📱', name: 'Mobile Phone' },
                { emoji: '📲', name: 'Mobile Phone with Arrow' },
                { emoji: '💻', name: 'Laptop' },
                { emoji: '⌨️', name: 'Keyboard' },
                { emoji: '🖥️', name: 'Desktop Computer' },
                { emoji: '🖨️', name: 'Printer' },
                { emoji: '🖱️', name: 'Computer Mouse' },
                { emoji: '💾', name: 'Floppy Disk' },
                { emoji: '💿', name: 'Optical Disk' },
                { emoji: '📀', name: 'DVD' },
                { emoji: '📷', name: 'Camera' },
                { emoji: '📸', name: 'Camera with Flash' },
                { emoji: '📹', name: 'Video Camera' },
                { emoji: '🎥', name: 'Movie Camera' },
                { emoji: '📞', name: 'Telephone Receiver' },
                { emoji: '☎️', name: 'Telephone' },
                { emoji: '📟', name: 'Pager' },
                { emoji: '📠', name: 'Fax Machine' },
                { emoji: '📺', name: 'Television' },
                { emoji: '📻', name: 'Radio' },
                { emoji: '⏰', name: 'Alarm Clock' },
                { emoji: '⌛', name: 'Hourglass Done' },
                { emoji: '⏳', name: 'Hourglass Not Done' },
                { emoji: '📡', name: 'Satellite Antenna' },
                { emoji: '🔋', name: 'Battery' },
                { emoji: '🔌', name: 'Electric Plug' },
                { emoji: '💡', name: 'Light Bulb' },
                { emoji: '🔦', name: 'Flashlight' },
                { emoji: '🕯️', name: 'Candle' },
                { emoji: '🧯', name: 'Fire Extinguisher' },
                { emoji: '💸', name: 'Money with Wings' },
                { emoji: '💵', name: 'Dollar Banknote' },
                { emoji: '💴', name: 'Yen Banknote' },
                { emoji: '💶', name: 'Euro Banknote' },
                { emoji: '💷', name: 'Pound Banknote' },
                { emoji: '💰', name: 'Money Bag' },
                { emoji: '💳', name: 'Credit Card' },
                { emoji: '💎', name: 'Gem Stone' },
                { emoji: '🔧', name: 'Wrench' },
                { emoji: '🔨', name: 'Hammer' },
                { emoji: '⚒️', name: 'Hammer and Pick' },
                { emoji: '🛠️', name: 'Hammer and Wrench' },
                { emoji: '⛏️', name: 'Pick' },
                { emoji: '🔩', name: 'Nut and Bolt' },
                { emoji: '⚙️', name: 'Gear' },
                { emoji: '🔫', name: 'Water Pistol' },
                { emoji: '💣', name: 'Bomb' },
                { emoji: '🔪', name: 'Kitchen Knife' },
                { emoji: '🗡️', name: 'Dagger' },
                { emoji: '⚔️', name: 'Crossed Swords' },
                { emoji: '🛡️', name: 'Shield' }
            ]
        },
        {
            id: 'symbols',
            icon: '❤️',
            nameEn: 'Symbols',
            nameDe: 'Symbole',
            nameHr: 'Simboli',
            emojis: [
                { emoji: '❤️', name: 'Red Heart' },
                { emoji: '🧡', name: 'Orange Heart' },
                { emoji: '💛', name: 'Yellow Heart' },
                { emoji: '💚', name: 'Green Heart' },
                { emoji: '💙', name: 'Blue Heart' },
                { emoji: '💜', name: 'Purple Heart' },
                { emoji: '🖤', name: 'Black Heart' },
                { emoji: '🤍', name: 'White Heart' },
                { emoji: '🤎', name: 'Brown Heart' },
                { emoji: '💔', name: 'Broken Heart' },
                { emoji: '❣️', name: 'Heart Exclamation' },
                { emoji: '💕', name: 'Two Hearts' },
                { emoji: '💞', name: 'Revolving Hearts' },
                { emoji: '💓', name: 'Beating Heart' },
                { emoji: '💗', name: 'Growing Heart' },
                { emoji: '💖', name: 'Sparkling Heart' },
                { emoji: '💘', name: 'Heart with Arrow' },
                { emoji: '💝', name: 'Heart with Ribbon' },
                { emoji: '💟', name: 'Heart Decoration' },
                { emoji: '💌', name: 'Love Letter' },
                { emoji: '💋', name: 'Kiss Mark' },
                { emoji: '💯', name: 'Hundred Points' },
                { emoji: '💢', name: 'Anger Symbol' },
                { emoji: '💥', name: 'Collision' },
                { emoji: '💫', name: 'Dizzy' },
                { emoji: '💦', name: 'Sweat Droplets' },
                { emoji: '💨', name: 'Dashing Away' },
                { emoji: '💬', name: 'Speech Balloon' },
                { emoji: '💭', name: 'Thought Balloon' },
                { emoji: '💤', name: 'Zzz' },
                { emoji: '✅', name: 'Check Mark Button' },
                { emoji: '☑️', name: 'Check Box with Check' },
                { emoji: '❌', name: 'Cross Mark' },
                { emoji: '❎', name: 'Cross Mark Button' },
                { emoji: '➕', name: 'Plus' },
                { emoji: '➖', name: 'Minus' },
                { emoji: '➗', name: 'Divide' },
                { emoji: '✖️', name: 'Multiply' },
                { emoji: '♾️', name: 'Infinity' },
                { emoji: '💲', name: 'Heavy Dollar Sign' },
                { emoji: '™️', name: 'Trade Mark' },
                { emoji: '©️', name: 'Copyright' },
                { emoji: '®️', name: 'Registered' },
                { emoji: '⚠️', name: 'Warning' },
                { emoji: '🚸', name: 'Children Crossing' },
                { emoji: '⛔', name: 'No Entry' },
                { emoji: '🚫', name: 'Prohibited' },
                { emoji: '🚳', name: 'No Bicycles' },
                { emoji: '🚭', name: 'No Smoking' },
                { emoji: '🚯', name: 'No Littering' },
                { emoji: '🚱', name: 'Non-Potable Water' },
                { emoji: '🚷', name: 'No Pedestrians' },
                { emoji: '📵', name: 'No Mobile Phones' },
                { emoji: '⬆️', name: 'Up Arrow' },
                { emoji: '↗️', name: 'Up-Right Arrow' },
                { emoji: '➡️', name: 'Right Arrow' },
                { emoji: '↘️', name: 'Down-Right Arrow' },
                { emoji: '⬇️', name: 'Down Arrow' },
                { emoji: '↙️', name: 'Down-Left Arrow' },
                { emoji: '⬅️', name: 'Left Arrow' },
                { emoji: '↖️', name: 'Up-Left Arrow' },
                { emoji: '↕️', name: 'Up-Down Arrow' },
                { emoji: '↔️', name: 'Left-Right Arrow' },
                { emoji: '🔴', name: 'Red Circle' },
                { emoji: '🟠', name: 'Orange Circle' },
                { emoji: '🟡', name: 'Yellow Circle' },
                { emoji: '🟢', name: 'Green Circle' },
                { emoji: '🔵', name: 'Blue Circle' },
                { emoji: '🟣', name: 'Purple Circle' },
                { emoji: '🟤', name: 'Brown Circle' },
                { emoji: '⚫', name: 'Black Circle' },
                { emoji: '⚪', name: 'White Circle' },
                { emoji: '🟥', name: 'Red Square' },
                { emoji: '🟧', name: 'Orange Square' },
                { emoji: '🟨', name: 'Yellow Square' },
                { emoji: '🟩', name: 'Green Square' },
                { emoji: '🟦', name: 'Blue Square' },
                { emoji: '🟪', name: 'Purple Square' },
                { emoji: '🟫', name: 'Brown Square' },
                { emoji: '⬛', name: 'Black Large Square' },
                { emoji: '⬜', name: 'White Large Square' }
            ]
        }
    ];

    tinymce.PluginManager.add('customemoji', function(editor, url) {
        // Detect language - use multiple fallback methods
        var editorLang = editor.getParam ? editor.getParam('language') : null;
        if (!editorLang && editor.settings) {
            editorLang = editor.settings.language;
        }
        if (!editorLang && typeof tinymce !== 'undefined' && tinymce.settings) {
            editorLang = tinymce.settings.language;
        }
        var lang = editorLang ? editorLang.substring(0, 2) : 'en';
        var searchPlaceholder = lang === 'de' ? 'Emoji suchen...' : (lang === 'hr' ? 'Pretraži emoji...' : 'Search emoji...');
        var buttonLabel = lang === 'de' ? 'Emoji einfügen' : (lang === 'hr' ? 'Umetni emoji' : 'Insert Emoji');

        // Add button to toolbar
        editor.ui.registry.addButton('customemoji', {
            text: '😀',
            tooltip: buttonLabel,
            onAction: function() {
                openEmojiPanel(editor, lang, searchPlaceholder);
            }
        });

        // Add CSS to make emoji button larger for all languages
        if (!document.getElementById('tinymce-customemoji-styles')) {
            var style = document.createElement('style');
            style.id = 'tinymce-customemoji-styles';
            style.textContent = `
                button[aria-label="Emoji einfügen"],
                button[aria-label="Insert Emoji"],
                button[aria-label="Umetni emoji"] {
                    font-size: 18px !important;
                }
            `;
            document.head.appendChild(style);
        }

        return {
            getMetadata: function() {
                return {
                    name: 'Custom Emoji Plugin',
                    url: 'https://github.com'
                };
            }
        };
    });

    function openEmojiPanel(editor, lang, searchPlaceholder) {
        var panelId = 'tinymce_emoji_panel_' + editor.id;
        var existingPanel = document.getElementById(panelId);

        // Remove existing panel if any
        if (existingPanel) {
            existingPanel.remove();
        }

        // Create main panel container
        var panel = document.createElement('div');
        panel.id = panelId;
        panel.className = 'tinymce-emoji-panel';
        panel.style.cssText = 'position: fixed; z-index: 10000; background: white; border: 1px solid #ccc; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); width: 280px; overflow: hidden; display: flex; flex-direction: column;';

        // Create header with category navigation
        var header = document.createElement('div');
        header.style.cssText = 'padding: 8px; border-bottom: 1px solid #e0e0e0; background: #f9f9f9;';

        // Category buttons
        var categoryNav = document.createElement('div');
        categoryNav.style.cssText = 'display: flex; gap: 4px; margin-bottom: 8px; overflow-x: auto; padding-bottom: 4px;';

        emojiGroups.forEach(function(group) {
            var groupBtn = document.createElement('button');
            groupBtn.type = 'button';
            groupBtn.className = 'emoji-category-btn';
            groupBtn.dataset.groupId = group.id;
            groupBtn.textContent = group.icon;
            groupBtn.title = lang === 'de' ? group.nameDe : (lang === 'hr' ? group.nameHr : group.nameEn);
            groupBtn.style.cssText = 'font-size: 20px; border: none; background: transparent; cursor: pointer; padding: 4px 6px; border-radius: 4px; transition: background 0.2s; border-bottom: 2px solid transparent;';

            groupBtn.onclick = function() {
                var section = document.getElementById('emoji-section-' + group.id);
                if (section) {
                    contentArea.scrollTop = section.offsetTop - contentArea.offsetTop;
                }
            };

            categoryNav.appendChild(groupBtn);
        });

        header.appendChild(categoryNav);

        // Search input
        var searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = searchPlaceholder;
        searchInput.style.cssText = 'width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; box-sizing: border-box;';

        searchInput.oninput = function() {
            var searchTerm = this.value.toLowerCase();

            if (searchTerm === '') {
                // Show all, restore group headers
                var allSections = contentArea.querySelectorAll('.emoji-section');
                allSections.forEach(function(section) {
                    section.style.display = 'block';
                });
                var allEmojis = contentArea.querySelectorAll('.emoji-item');
                allEmojis.forEach(function(emoji) {
                    emoji.style.visibility = 'visible';
                    emoji.style.position = 'relative';
                });
            } else {
                // Show/hide groups and emojis based on search
                emojiGroups.forEach(function(group) {
                    var section = document.getElementById('emoji-section-' + group.id);
                    var matchingEmojis = 0;

                    // Check each emoji in this group
                    var emojisInGroup = section.querySelectorAll('.emoji-item');
                    emojisInGroup.forEach(function(emoji) {
                        var name = emoji.dataset.name.toLowerCase();
                        if (name.includes(searchTerm)) {
                            emoji.style.visibility = 'visible';
                            emoji.style.position = 'relative';
                            matchingEmojis++;
                        } else {
                            emoji.style.visibility = 'hidden';
                            emoji.style.position = 'absolute';
                        }
                    });

                    // Show/hide entire section based on matches
                    if (matchingEmojis > 0) {
                        section.style.display = 'block';
                    } else {
                        section.style.display = 'none';
                    }
                });
            }
        };

        header.appendChild(searchInput);
        panel.appendChild(header);

        // Create scrollable content area
        var contentArea = document.createElement('div');
        contentArea.style.cssText = 'max-height: 300px; overflow-y: auto; overflow-x: hidden; padding: 8px;';

        // Add emoji groups
        emojiGroups.forEach(function(group) {
            var section = document.createElement('div');
            section.id = 'emoji-section-' + group.id;
            section.className = 'emoji-section';

            // Group header
            var groupHeader = document.createElement('div');
            groupHeader.textContent = lang === 'de' ? group.nameDe : (lang === 'hr' ? group.nameHr : group.nameEn);
            groupHeader.style.cssText = 'font-size: 12px; font-weight: bold; color: #666; margin-bottom: 6px; margin-top: 8px;';
            section.appendChild(groupHeader);

            // Emoji grid for this group
            var groupGrid = document.createElement('div');
            groupGrid.style.cssText = 'display: grid; grid-template-columns: repeat(8, 1fr); gap: 1px; margin-bottom: 8px;';

            group.emojis.forEach(function(item) {
                var emojiBtn = document.createElement('button');
                emojiBtn.type = 'button';
                emojiBtn.className = 'emoji-item';
                emojiBtn.dataset.name = item.name;
                emojiBtn.textContent = item.emoji;
                emojiBtn.title = item.name;
                emojiBtn.style.cssText = 'font-size: 24px; border: none; background: transparent; cursor: pointer; padding: 5px; border-radius: 3px; transition: background 0.2s; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; min-height: 34px;';

                emojiBtn.onmouseover = function() {
                    this.style.background = '#f0f0f0';
                    // Update footer preview
                    footer.innerHTML = '<span style="font-size: 20px; margin-right: 8px;">' + item.emoji + '</span><span style="font-size: 13px; color: #666;">' + item.name + '</span>';
                };

                emojiBtn.onmouseout = function() {
                    this.style.background = 'transparent';
                    footer.innerHTML = '';
                };

                emojiBtn.onclick = function() {
                    editor.insertContent(item.emoji);
                    panel.remove();
                    editor.focus();
                };

                groupGrid.appendChild(emojiBtn);
            });

            section.appendChild(groupGrid);
            contentArea.appendChild(section);
        });

        // Scroll tracking to highlight active category
        contentArea.onscroll = function() {
            var scrollTop = this.scrollTop;
            var activeGroup = null;

            emojiGroups.forEach(function(group) {
                var section = document.getElementById('emoji-section-' + group.id);
                if (section && section.offsetTop - contentArea.offsetTop <= scrollTop + 50) {
                    activeGroup = group.id;
                }
            });

            // Update active category button
            var categoryBtns = categoryNav.querySelectorAll('.emoji-category-btn');
            var activeBtn = null;

            categoryBtns.forEach(function(btn) {
                if (btn.dataset.groupId === activeGroup) {
                    btn.style.borderBottom = '2px solid #1976d2';
                    btn.style.background = '#e3f2fd';
                    activeBtn = btn;
                } else {
                    btn.style.borderBottom = '2px solid transparent';
                    btn.style.background = 'transparent';
                }
            });

            // Auto-scroll category navigation to active button
            if (activeBtn) {
                var btnLeft = activeBtn.offsetLeft;
                var btnRight = btnLeft + activeBtn.offsetWidth;
                var navScrollLeft = categoryNav.scrollLeft;
                var navWidth = categoryNav.offsetWidth;

                // Add some padding for better visibility
                var scrollPadding = 8;

                // Check if button is outside visible area
                if (btnLeft < navScrollLeft + scrollPadding) {
                    // Scroll left to show button - if it's near the start, scroll to 0
                    if (btnLeft < scrollPadding * 2) {
                        categoryNav.scrollLeft = 0;
                    } else {
                        categoryNav.scrollLeft = btnLeft - scrollPadding;
                    }
                } else if (btnRight > navScrollLeft + navWidth - scrollPadding) {
                    // Scroll right to show button
                    categoryNav.scrollLeft = btnRight - navWidth + scrollPadding;
                }
            }
        };

        panel.appendChild(contentArea);

        // Create footer for emoji preview
        var footer = document.createElement('div');
        footer.style.cssText = 'padding: 8px; border-top: 1px solid #e0e0e0; height: 40px; display: flex; align-items: center; background: #f9f9f9; box-sizing: border-box;';
        panel.appendChild(footer);

        document.body.appendChild(panel);

        // Position panel near the button
        setTimeout(function() {
            var buttonLabel = lang === 'de' ? 'Emoji einfügen' : (lang === 'hr' ? 'Umetni emoji' : 'Insert Emoji');
            var button = editor.getContainer().querySelector('[aria-label="' + buttonLabel + '"]');

            if (!button) {
                // Fallback: try to find button by text content
                var buttons = editor.getContainer().querySelectorAll('button');
                for (var i = 0; i < buttons.length; i++) {
                    if (buttons[i].textContent.includes('😀')) {
                        button = buttons[i];
                        break;
                    }
                }
            }

            if (button) {
                var rect = button.getBoundingClientRect();
                var panelHeight = panel.offsetHeight;
                var panelWidth = panel.offsetWidth;

                var top = rect.bottom + window.scrollY + 5;
                var left = rect.left + window.scrollX;

                if (left + panelWidth > window.innerWidth) {
                    left = window.innerWidth - panelWidth - 10;
                }
                if (top + panelHeight > window.innerHeight + window.scrollY) {
                    top = rect.top + window.scrollY - panelHeight - 5;
                }

                panel.style.top = top + 'px';
                panel.style.left = left + 'px';
            } else {
                panel.style.top = '50%';
                panel.style.left = '50%';
                panel.style.transform = 'translate(-50%, -50%)';
            }
        }, 10);

        // Close panel when clicking outside
        var closeHandler = function(e) {
            // Check if panel still exists
            if (!document.body.contains(panel)) {
                document.removeEventListener('click', closeHandler, true);
                return;
            }

            // Check if click is inside panel
            if (panel.contains(e.target)) {
                return;
            }

            // Check if click is on the emoji button or inside TinyMCE toolbar
            var target = e.target;
            while (target && target !== document.body) {
                // Check for TinyMCE button
                if (target.tagName === 'BUTTON' || target.tagName === 'A') {
                    var ariaLabel = target.getAttribute('aria-label');
                    var title = target.getAttribute('title');
                    if (ariaLabel && ariaLabel.toLowerCase().includes('emoji') ||
                        title && title.toLowerCase().includes('emoji') ||
                        target.textContent && target.textContent.includes('😀')) {
                        return; // Don't close if clicking the button
                    }
                }
                target = target.parentElement;
            }

            // Close panel
            panel.remove();
            document.removeEventListener('click', closeHandler, true);
        };

        // Add handler with a slight delay to avoid immediate closure
        setTimeout(function() {
            document.addEventListener('click', closeHandler, true);
        }, 100);

        // Trigger initial scroll event to highlight first category
        contentArea.onscroll();
    }

})();
