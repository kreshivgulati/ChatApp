import { useState, useEffect, useRef } from 'react';

// Organized emojis with searchable tags
const EMOJI_DATA = [
  // Smileys & Emotion
  { emoji: '😀', name: 'grinning face', category: 'smileys', tags: ['happy', 'smile', 'laugh', 'joy', 'grin', 'face'] },
  { emoji: '😃', name: 'grinning face with big eyes', category: 'smileys', tags: ['happy', 'smile', 'laugh', 'joy', 'grin', 'face'] },
  { emoji: '😄', name: 'grinning face with smiling eyes', category: 'smileys', tags: ['happy', 'smile', 'laugh', 'joy', 'grin', 'face'] },
  { emoji: '😁', name: 'beaming face with smiling eyes', category: 'smileys', tags: ['happy', 'smile', 'laugh', 'joy', 'grin', 'face', 'excited'] },
  { emoji: '😆', name: 'grinning squinting face', category: 'smileys', tags: ['happy', 'smile', 'laugh', 'joy', 'grin', 'squint', 'face'] },
  { emoji: '😅', name: 'grinning face with sweat', category: 'smileys', tags: ['happy', 'smile', 'laugh', 'joy', 'sweat', 'relief', 'face'] },
  { emoji: '🤣', name: 'rolling on the floor laughing', category: 'smileys', tags: ['happy', 'laugh', 'joy', 'rofl', 'funny', 'face'] },
  { emoji: '😂', name: 'face with tears of joy', category: 'smileys', tags: ['happy', 'laugh', 'joy', 'lol', 'funny', 'tears', 'face'] },
  { emoji: '🙂', name: 'slightly smiling face', category: 'smileys', tags: ['happy', 'smile', 'neutral', 'face'] },
  { emoji: '🙃', name: 'upside-down face', category: 'smileys', tags: ['silly', 'sarcasm', 'flipped', 'face'] },
  { emoji: '😉', name: 'winking face', category: 'smileys', tags: ['wink', 'flirt', 'silly', 'face'] },
  { emoji: '😊', name: 'smiling face with smiling eyes', category: 'smileys', tags: ['happy', 'smile', 'warm', 'blush', 'face'] },
  { emoji: '😇', name: 'smiling face with halo', category: 'smileys', tags: ['angel', 'innocent', 'good', 'face'] },
  { emoji: '🥰', name: 'smiling face with hearts', category: 'smileys', tags: ['love', 'hearts', 'crush', 'adorable', 'face'] },
  { emoji: '😍', name: 'smiling face with heart-eyes', category: 'smileys', tags: ['love', 'heart', 'crush', 'like', 'face'] },
  { emoji: '🤩', name: 'star-struck', category: 'smileys', tags: ['star', 'excited', 'wow', 'face'] },
  { emoji: '😘', name: 'face blowing a kiss', category: 'smileys', tags: ['love', 'kiss', 'flirt', 'face'] },
  { emoji: '😗', name: 'kissing face', category: 'smileys', tags: ['love', 'kiss', 'face'] },
  { emoji: '😚', name: 'kissing face with closed eyes', category: 'smileys', tags: ['love', 'kiss', 'blush', 'face'] },
  { emoji: '😋', name: 'face savoring food', category: 'smileys', tags: ['yummy', 'hungry', 'food', 'delicious', 'face'] },
  { emoji: '😛', name: 'face with tongue', category: 'smileys', tags: ['silly', 'tongue', 'playful', 'face'] },
  { emoji: '😜', name: 'winking face with tongue', category: 'smileys', tags: ['silly', 'wink', 'tongue', 'playful', 'face'] },
  { emoji: '🤪', name: 'zany face', category: 'smileys', tags: ['crazy', 'silly', 'goofy', 'fun', 'face'] },
  { emoji: '😝', name: 'squinting face with tongue', category: 'smileys', tags: ['silly', 'tongue', 'squint', 'playful', 'face'] },
  { emoji: '🤑', name: 'money-mouth face', category: 'smileys', tags: ['money', 'rich', 'wealth', 'face'] },
  { emoji: '🤗', name: 'hugging face', category: 'smileys', tags: ['hug', 'warm', 'friendly', 'face'] },
  { emoji: '🫣', name: 'face with peeking eye', category: 'smileys', tags: ['peek', 'scared', 'shy', 'face'] },
  { emoji: '🤫', name: 'shushing face', category: 'smileys', tags: ['quiet', 'shh', 'secret', 'silence', 'face'] },
  { emoji: '🤔', name: 'thinking face', category: 'smileys', tags: ['think', 'ponder', 'question', 'hmm', 'face'] },
  { emoji: '🫡', name: 'saluting face', category: 'smileys', tags: ['salute', 'respect', 'yes', 'face'] },
  { emoji: '🤐', name: 'zipper-mouth face', category: 'smileys', tags: ['quiet', 'secret', 'zipped', 'face'] },
  { emoji: '🤨', name: 'face with raised eyebrow', category: 'smileys', tags: ['suspicious', 'doubt', 'hmm', 'face'] },
  { emoji: '😐', name: 'neutral face', category: 'smileys', tags: ['neutral', 'meh', 'whatever', 'face'] },
  { emoji: '😑', name: 'expressionless face', category: 'smileys', tags: ['neutral', 'meh', 'expressionless', 'face'] },
  { emoji: '😶', name: 'face without mouth', category: 'smileys', tags: ['silent', 'quiet', 'speechless', 'face'] },
  { emoji: '😏', name: 'smirking face', category: 'smileys', tags: ['smirk', 'sly', 'flirt', 'face'] },
  { emoji: '😒', name: 'unamused face', category: 'smileys', tags: ['unamused', 'bored', 'meh', 'disappointed', 'face'] },
  { emoji: '🙄', name: 'face with rolling eyes', category: 'smileys', tags: ['roll eyes', 'bored', 'annoyed', 'whatever', 'face'] },
  { emoji: '😬', name: 'grimacing face', category: 'smileys', tags: ['grimace', 'awkward', 'nervous', 'face'] },
  { emoji: '🤥', name: 'lying face', category: 'smileys', tags: ['lying', 'pinocchio', 'fake', 'face'] },
  { emoji: '😌', name: 'relieved face', category: 'smileys', tags: ['relieved', 'calm', 'peace', 'satisfied', 'face'] },
  { emoji: '😔', name: 'pensive face', category: 'smileys', tags: ['sad', 'pensive', 'sorry', 'face'] },
  { emoji: '😪', name: 'sleepy face', category: 'smileys', tags: ['sleepy', 'tired', 'drool', 'face'] },
  { emoji: '🤤', name: 'drooling face', category: 'smileys', tags: ['drool', 'hungry', 'tasty', 'face'] },
  { emoji: '😴', name: 'sleeping face', category: 'smileys', tags: ['sleep', 'zzz', 'night', 'tired', 'face'] },
  { emoji: '😷', name: 'face with medical mask', category: 'smileys', tags: ['sick', 'mask', 'doctor', 'virus', 'face'] },
  { emoji: '🤒', name: 'face with thermometer', category: 'smileys', tags: ['sick', 'fever', 'ill', 'face'] },
  { emoji: '🤕', name: 'face with head-bandage', category: 'smileys', tags: ['sick', 'hurt', 'injury', 'face'] },
  { emoji: '🤢', name: 'nauseated face', category: 'smileys', tags: ['sick', 'disgust', 'vomit', 'green', 'face'] },
  { emoji: '🤮', name: 'face vomiting', category: 'smileys', tags: ['sick', 'vomit', 'gross', 'face'] },
  { emoji: '🥵', name: 'hot face', category: 'smileys', tags: ['hot', 'heat', 'summer', 'sweat', 'face'] },
  { emoji: '🥶', name: 'cold face', category: 'smileys', tags: ['cold', 'freeze', 'winter', 'ice', 'face'] },
  { emoji: '🥴', name: 'woozy face', category: 'smileys', tags: ['drunk', 'dizzy', 'tired', 'face'] },
  { emoji: '😵', name: 'face with crossed eyes', category: 'smileys', tags: ['dizzy', 'dead', 'shocked', 'face'] },
  { emoji: '🤯', name: 'exploding head', category: 'smileys', tags: ['mindblown', 'wow', 'shocked', 'explode', 'face'] },
  { emoji: '🤠', name: 'cowboy hat face', category: 'smileys', tags: ['cowboy', 'hat', 'silly', 'face'] },
  { emoji: '🥳', name: 'partying face', category: 'smileys', tags: ['party', 'celebrate', 'birthday', 'excited', 'face'] },
  { emoji: '😎', name: 'smiling face with sunglasses', category: 'smileys', tags: ['cool', 'sunglasses', 'glasses', 'chill', 'face'] },
  { emoji: '🤓', name: 'nerd face', category: 'smileys', tags: ['nerd', 'geek', 'glasses', 'face'] },
  { emoji: '🧐', name: 'face with monocle', category: 'smileys', tags: ['monocle', 'smart', 'detective', 'face'] },
  { emoji: '😕', name: 'confused face', category: 'smileys', tags: ['confused', 'unsure', 'hmmm', 'face'] },
  { emoji: '😟', name: 'worried face', category: 'smileys', tags: ['worried', 'nervous', 'scared', 'face'] },
  { emoji: '🙁', name: 'slightly frowning face', category: 'smileys', tags: ['sad', 'frown', 'face'] },
  { emoji: '😮', name: 'face with open mouth', category: 'smileys', tags: ['shocked', 'wow', 'surprise', 'face'] },
  { emoji: '😲', name: 'astonished face', category: 'smileys', tags: ['shocked', 'wow', 'surprise', 'astonished', 'face'] },
  { emoji: '😳', name: 'flushed face', category: 'smileys', tags: ['flushed', 'blush', 'embarrassed', 'shy', 'face'] },
  { emoji: '🥺', name: 'pleading face', category: 'smileys', tags: ['please', 'pleading', 'beg', 'sad', 'cute', 'eyes', 'face'] },
  { emoji: '😦', name: 'frowning face with open mouth', category: 'smileys', tags: ['sad', 'shocked', 'scared', 'face'] },
  { emoji: '😨', name: 'fearful face', category: 'smileys', tags: ['scared', 'fear', 'terrified', 'face'] },
  { emoji: '😰', name: 'anxious face with sweat', category: 'smileys', tags: ['scared', 'nervous', 'sweat', 'anxious', 'face'] },
  { emoji: '😭', name: 'loudly crying face', category: 'smileys', tags: ['sad', 'cry', 'tears', 'sob', 'face'] },
  { emoji: '😱', name: 'face screaming in fear', category: 'smileys', tags: ['scared', 'scream', 'fear', 'shocked', 'face'] },
  { emoji: '😖', name: 'confounded face', category: 'smileys', tags: ['sad', 'angry', 'hurt', 'frustrated', 'face'] },
  { emoji: '😣', name: 'persevering face', category: 'smileys', tags: ['sad', 'struggle', 'trying', 'face'] },
  { emoji: '😞', name: 'disappointed face', category: 'smileys', tags: ['sad', 'disappointed', 'sorry', 'face'] },
  { emoji: '😓', name: 'downcast face with sweat', category: 'smileys', tags: ['sad', 'sweat', 'tired', 'face'] },
  { emoji: '😩', name: 'weary face', category: 'smileys', tags: ['sad', 'tired', 'weary', 'groan', 'face'] },
  { emoji: '😫', name: 'tired face', category: 'smileys', tags: ['sad', 'tired', 'groan', 'exhausted', 'face'] },
  { emoji: '🥱', name: 'yawning face', category: 'smileys', tags: ['yawn', 'tired', 'sleepy', 'bored', 'face'] },
  { emoji: '😤', name: 'face with steam from nose', category: 'smileys', tags: ['angry', 'mad', 'steam', 'triumph', 'face'] },
  { emoji: '😡', name: 'enraged face', category: 'smileys', tags: ['angry', 'mad', 'furious', 'red', 'face'] },
  { emoji: '😠', name: 'angry face', category: 'smileys', tags: ['angry', 'mad', 'furious', 'face'] },
  { emoji: '💀', name: 'skull', category: 'smileys', tags: ['dead', 'death', 'skeleton', 'funny', 'lol'] },
  { emoji: '💩', name: 'pile of poop', category: 'smileys', tags: ['poop', 'poo', 'shit', 'silly', 'brown'] },
  { emoji: '🤡', name: 'clown face', category: 'smileys', tags: ['clown', 'silly', 'circus', 'face'] },
  { emoji: '👻', name: 'ghost', category: 'smileys', tags: ['ghost', 'spooky', 'halloween', 'scary'] },
  { emoji: '👽', name: 'alien', category: 'smileys', tags: ['alien', 'ufo', 'space', 'spooky'] },
  { emoji: '👾', name: 'alien monster', category: 'smileys', tags: ['game', 'arcade', 'retro', 'pixel', 'monster'] },
  { emoji: '🤖', name: 'robot', category: 'smileys', tags: ['robot', 'tech', 'bot', 'machine'] },

  // People & Gestures
  { emoji: '👋', name: 'waving hand', category: 'people', tags: ['hello', 'hi', 'bye', 'wave', 'hand'] },
  { emoji: '🤚', name: 'raised back of hand', category: 'people', tags: ['hand', 'backhand', 'stop'] },
  { emoji: '🖐️', name: 'hand with fingers splayed', category: 'people', tags: ['hand', 'five', 'fingers'] },
  { emoji: '✋', name: 'raised hand', category: 'people', tags: ['hand', 'stop', 'highfive'] },
  { emoji: '🖖', name: 'vulcan salute', category: 'people', tags: ['spock', 'vulcan', 'salute', 'hand', 'nerd'] },
  { emoji: '🫱', name: 'rightwards hand', category: 'people', tags: ['hand', 'shake', 'reach'] },
  { emoji: '🫲', name: 'leftwards hand', category: 'people', tags: ['hand', 'shake', 'reach'] },
  { emoji: '🫵', name: 'index pointing at the viewer', category: 'people', tags: ['you', 'point', 'index', 'hand'] },
  { emoji: '👌', name: 'OK hand', category: 'people', tags: ['ok', 'okay', 'good', 'perfect', 'hand'] },
  { emoji: '🤌', name: 'pinched fingers', category: 'people', tags: ['italian', 'gesture', 'what', 'hand'] },
  { emoji: '🤏', name: 'pinched hand', category: 'people', tags: ['small', 'little', 'pinch', 'hand'] },
  { emoji: '✌️', name: 'victory hand', category: 'people', tags: ['peace', 'victory', 'two', 'hand'] },
  { emoji: '🤞', name: 'crossed fingers', category: 'people', tags: ['luck', 'hope', 'fingers', 'crossed', 'hand'] },
  { emoji: '🤟', name: 'love-you gesture', category: 'people', tags: ['love', 'sign', 'hand'] },
  { emoji: '🤘', name: 'sign of the horns', category: 'people', tags: ['rock', 'metal', 'horns', 'hand'] },
  { emoji: '🤙', name: 'call me hand', category: 'people', tags: ['call', 'phone', 'shaka', 'hand'] },
  { emoji: '👈', name: 'backhand index pointing left', category: 'people', tags: ['left', 'point', 'direction', 'hand'] },
  { emoji: '👉', name: 'backhand index pointing right', category: 'people', tags: ['right', 'point', 'direction', 'hand'] },
  { emoji: '👆', name: 'backhand index pointing up', category: 'people', tags: ['up', 'point', 'direction', 'hand'] },
  { emoji: '🖕', name: 'middle finger', category: 'people', tags: ['offensive', 'rude', 'middle finger', 'hand'] },
  { emoji: '👇', name: 'backhand index pointing down', category: 'people', tags: ['down', 'point', 'direction', 'hand'] },
  { emoji: '👍', name: 'thumbs up', category: 'people', tags: ['yes', 'good', 'like', 'agree', 'thumbsup', 'hand'] },
  { emoji: '👎', name: 'thumbs down', category: 'people', tags: ['no', 'bad', 'dislike', 'disagree', 'thumbsdown', 'hand'] },
  { emoji: '✊', name: 'raised fist', category: 'people', tags: ['fist', 'power', 'solidarity', 'hand'] },
  { emoji: '👊', name: 'oncoming fist', category: 'people', tags: ['fist', 'punch', 'brofist', 'hand'] },
  { emoji: '🤛', name: 'left-facing fist', category: 'people', tags: ['fist', 'punch', 'left', 'hand'] },
  { emoji: '🤜', name: 'right-facing fist', category: 'people', tags: ['fist', 'punch', 'right', 'hand'] },
  { emoji: '👏', name: 'clapping hands', category: 'people', tags: ['clap', 'applause', 'bravo', 'good', 'hands'] },
  { emoji: '🙌', name: 'raising hands', category: 'people', tags: ['hooray', 'celebrate', 'praise', 'hands'] },
  { emoji: '👐', name: 'open hands', category: 'people', tags: ['open', 'hug', 'hands'] },
  { emoji: '🤲', name: 'palms up together', category: 'people', tags: ['pray', 'offer', 'hands'] },
  { emoji: '🤝', name: 'handshake', category: 'people', tags: ['shake', 'agreement', 'deal', 'meet', 'partnership'] },
  { emoji: '🙏', name: 'folded hands', category: 'people', tags: ['please', 'pray', 'thanks', 'thank you', 'namaste', 'hope'] },
  { emoji: '💪', name: 'flexed biceps', category: 'people', tags: ['strong', 'power', 'muscle', 'gym', 'workout'] },
  { emoji: '🧠', name: 'brain', category: 'people', tags: ['brain', 'mind', 'smart', 'think', 'intellect'] },
  { emoji: '❤️', name: 'red heart', category: 'people', tags: ['love', 'heart', 'like', 'valentines'] },
  { emoji: '🔥', name: 'fire', category: 'people', tags: ['hot', 'fire', 'lit', 'cool', 'awesome'] },
  { emoji: '✨', name: 'sparkles', category: 'people', tags: ['sparkle', 'magic', 'clean', 'shiny', 'new'] },

  // Animals & Nature
  { emoji: '🐶', name: 'dog face', category: 'nature', tags: ['dog', 'puppy', 'pet', 'animal', 'cute'] },
  { emoji: '🐱', name: 'cat face', category: 'nature', tags: ['cat', 'kitten', 'pet', 'animal', 'cute', 'meow'] },
  { emoji: '🐭', name: 'mouse face', category: 'nature', tags: ['mouse', 'rodent', 'animal', 'cute'] },
  { emoji: '🐹', name: 'hamster face', category: 'nature', tags: ['hamster', 'pet', 'animal', 'cute'] },
  { emoji: '🐰', name: 'rabbit face', category: 'nature', tags: ['rabbit', 'bunny', 'pet', 'animal', 'cute'] },
  { emoji: '🦊', name: 'fox face', category: 'nature', tags: ['fox', 'animal', 'wild'] },
  { emoji: '🐻', name: 'bear face', category: 'nature', tags: ['bear', 'animal', 'wild'] },
  { emoji: '🐼', name: 'panda face', category: 'nature', tags: ['panda', 'animal', 'cute'] },
  { emoji: '🐨', name: 'koala', category: 'nature', tags: ['koala', 'animal', 'cute'] },
  { emoji: '🐯', name: 'tiger face', category: 'nature', tags: ['tiger', 'cat', 'animal', 'wild'] },
  { emoji: '🦁', name: 'lion face', category: 'nature', tags: ['lion', 'animal', 'wild'] },
  { emoji: '🐮', name: 'cow face', category: 'nature', tags: ['cow', 'animal', 'farm'] },
  { emoji: '🐷', name: 'pig face', category: 'nature', tags: ['pig', 'animal', 'farm'] },
  { emoji: '🐸', name: 'frog face', category: 'nature', tags: ['frog', 'amphibian', 'animal'] },
  { emoji: '🐵', name: 'monkey face', category: 'nature', tags: ['monkey', 'animal', 'silly'] },
  { emoji: '🐔', name: 'chicken', category: 'nature', tags: ['chicken', 'bird', 'farm'] },
  { emoji: '🐧', name: 'penguin', category: 'nature', tags: ['penguin', 'bird', 'cold'] },
  { emoji: '🐦', name: 'bird', category: 'nature', tags: ['bird', 'fly', 'animal'] },
  { emoji: '🦆', name: 'duck', category: 'nature', tags: ['duck', 'bird', 'pond'] },
  { emoji: '🐝', name: 'honeybee', category: 'nature', tags: ['bee', 'bug', 'insect', 'honey', 'nature'] },
  { emoji: '🐛', name: 'bug', category: 'nature', tags: ['bug', 'insect', 'caterpillar', 'nature'] },
  { emoji: '🦋', name: 'butterfly', category: 'nature', tags: ['butterfly', 'bug', 'insect', 'pretty', 'nature'] },
  { emoji: '🕸️', name: 'spider web', category: 'nature', tags: ['web', 'spider', 'halloween', 'spooky'] },
  { emoji: '🐢', name: 'turtle', category: 'nature', tags: ['turtle', 'slow', 'animal', 'ocean'] },
  { emoji: '🐍', name: 'snake', category: 'nature', tags: ['snake', 'reptile', 'animal', 'spooky'] },
  { emoji: '🐬', name: 'dolphin', category: 'nature', tags: ['dolphin', 'ocean', 'sea', 'animal', 'swim'] },
  { emoji: '🐙', name: 'octopus', category: 'nature', tags: ['octopus', 'ocean', 'sea', 'animal', 'tentacles'] },
  { emoji: '🌴', name: 'palm tree', category: 'nature', tags: ['palm', 'tree', 'beach', 'summer', 'island'] },
  { emoji: '🌲', name: 'evergreen tree', category: 'nature', tags: ['tree', 'forest', 'pine', 'nature'] },
  { emoji: '🌸', name: 'cherry blossom', category: 'nature', tags: ['flower', 'blossom', 'pink', 'spring', 'nature'] },
  { emoji: '🌹', name: 'rose', category: 'nature', tags: ['flower', 'rose', 'love', 'red', 'nature'] },
  { emoji: '🍀', name: 'four leaf clover', category: 'nature', tags: ['clover', 'luck', 'green', 'irish'] },
  { emoji: '🌈', name: 'rainbow', category: 'nature', tags: ['rainbow', 'color', 'rain', 'sky', 'beautiful'] },
  { emoji: '⭐', name: 'star', category: 'nature', tags: ['star', 'yellow', 'night', 'shine'] },

  // Food & Drink
  { emoji: '🍏', name: 'green apple', category: 'food', tags: ['apple', 'fruit', 'green', 'healthy', 'food'] },
  { emoji: '🍎', name: 'red apple', category: 'food', tags: ['apple', 'fruit', 'red', 'healthy', 'food'] },
  { emoji: '🍌', name: 'banana', category: 'food', tags: ['banana', 'fruit', 'yellow', 'food'] },
  { emoji: '🍉', name: 'watermelon', category: 'food', tags: ['watermelon', 'fruit', 'summer', 'melon', 'food'] },
  { emoji: '🍇', name: 'grapes', category: 'food', tags: ['grapes', 'fruit', 'wine', 'food'] },
  { emoji: '🍓', name: 'strawberry', category: 'food', tags: ['strawberry', 'fruit', 'sweet', 'red', 'food'] },
  { emoji: '🍒', name: 'cherries', category: 'food', tags: ['cherries', 'fruit', 'sweet', 'food'] },
  { emoji: '🍍', name: 'pineapple', category: 'food', tags: ['pineapple', 'fruit', 'tropical', 'food'] },
  { emoji: '🥑', name: 'avocado', category: 'food', tags: ['avocado', 'fruit', 'guac', 'healthy', 'food'] },
  { emoji: '🥕', name: 'carrot', category: 'food', tags: ['carrot', 'vegetable', 'healthy', 'orange', 'food'] },
  { emoji: '🌽', name: 'ear of corn', category: 'food', tags: ['corn', 'vegetable', 'yellow', 'food'] },
  { emoji: '🍕', name: 'pizza', category: 'food', tags: ['pizza', 'cheese', 'slice', 'italian', 'junk', 'food'] },
  { emoji: '🍔', name: 'hamburger', category: 'food', tags: ['burger', 'beef', 'fastfood', 'junk', 'food'] },
  { emoji: '🍟', name: 'french fries', category: 'food', tags: ['fries', 'potato', 'fastfood', 'junk', 'food'] },
  { emoji: '🌭', name: 'hot dog', category: 'food', tags: ['hotdog', 'sausage', 'fastfood', 'food'] },
  { emoji: '🌮', name: 'taco', category: 'food', tags: ['taco', 'mexican', 'beef', 'spicy', 'food'] },
  { emoji: '🍣', name: 'sushi', category: 'food', tags: ['sushi', 'fish', 'japanese', 'rice', 'food'] },
  { emoji: '🍜', name: 'steaming bowl', category: 'food', tags: ['ramen', 'noodles', 'soup', 'asian', 'food'] },
  { emoji: '🍩', name: 'donut', category: 'food', tags: ['donut', 'doughnut', 'sweet', 'dessert', 'junk', 'food'] },
  { emoji: '🍪', name: 'cookie', category: 'food', tags: ['cookie', 'chocolate', 'sweet', 'dessert', 'food'] },
  { emoji: '🍰', name: 'shortcake', category: 'food', tags: ['cake', 'slice', 'sweet', 'dessert', 'birthday', 'food'] },
  { emoji: '🍫', name: 'chocolate bar', category: 'food', tags: ['chocolate', 'candy', 'sweet', 'dessert', 'food'] },
  { emoji: '🍦', name: 'soft ice cream', category: 'food', tags: ['icecream', 'cold', 'sweet', 'dessert', 'summer', 'food'] },
  { emoji: '☕', name: 'hot beverage', category: 'food', tags: ['coffee', 'tea', 'cafe', 'morning', 'drink'] },
  { emoji: '🍵', name: 'teacup without handle', category: 'food', tags: ['tea', 'green tea', 'matcha', 'drink'] },
  { emoji: '🍺', name: 'beer mug', category: 'food', tags: ['beer', 'mug', 'alcohol', 'party', 'bar', 'drink'] },
  { emoji: '🍻', name: 'clinking beer mugs', category: 'food', tags: ['beers', 'clink', 'cheers', 'alcohol', 'party', 'drink'] },
  { emoji: '🍷', name: 'wine glass', category: 'food', tags: ['wine', 'glass', 'alcohol', 'red wine', 'drink'] },
  { emoji: '🍹', name: 'tropical drink', category: 'food', tags: ['cocktail', 'tropical', 'summer', 'alcohol', 'drink'] },
  { emoji: '🥤', name: 'cup with straw', category: 'food', tags: ['soda', 'cup', 'juice', 'cola', 'drink'] },

  // Activities
  { emoji: '⚽', name: 'soccer ball', category: 'activities', tags: ['soccer', 'football', 'ball', 'sports', 'game'] },
  { emoji: '🏀', name: 'basketball', category: 'activities', tags: ['basketball', 'ball', 'sports', 'game'] },
  { emoji: '🏈', name: 'american football', category: 'activities', tags: ['football', 'ball', 'sports', 'game'] },
  { emoji: '⚾', name: 'baseball', category: 'activities', tags: ['baseball', 'ball', 'sports', 'game'] },
  { emoji: '🎾', name: 'tennis', category: 'activities', tags: ['tennis', 'ball', 'sports', 'game'] },
  { emoji: '🏐', name: 'volleyball', category: 'activities', tags: ['volleyball', 'ball', 'sports', 'game'] },
  { emoji: '🏓', name: 'ping pong', category: 'activities', tags: ['table tennis', 'pingpong', 'sports', 'game'] },
  { emoji: '🎯', name: 'bullseye', category: 'activities', tags: ['darts', 'target', 'bullseye', 'game', 'focus'] },
  { emoji: '🎮', name: 'video game', category: 'activities', tags: ['game', 'controller', 'playstation', 'xbox', 'nintendo', 'play'] },
  { emoji: '🎲', name: 'game die', category: 'activities', tags: ['dice', 'boardgame', 'gamble', 'luck'] },
  { emoji: '🎨', name: 'artist palette', category: 'activities', tags: ['paint', 'art', 'artist', 'draw', 'create'] },
  { emoji: '🎬', name: 'clapper board', category: 'activities', tags: ['movie', 'film', 'cinema', 'hollywood', 'direct'] },
  { emoji: '🎤', name: 'microphone', category: 'activities', tags: ['sing', 'karaoke', 'music', 'mic', 'audio'] },
  { emoji: '🎧', name: 'headphones', category: 'activities', tags: ['music', 'audio', 'listen', 'headphones', 'sound'] },
  { emoji: '🎸', name: 'guitar', category: 'activities', tags: ['guitar', 'music', 'instrument', 'rock'] },
  { emoji: '🎹', name: 'musical keyboard', category: 'activities', tags: ['piano', 'music', 'instrument', 'keyboard'] },
  { emoji: '🏆', name: 'trophy', category: 'activities', tags: ['trophy', 'win', 'prize', 'award', 'champion'] },

  // Travel & Places
  { emoji: '🚗', name: 'automobile', category: 'travel', tags: ['car', 'drive', 'travel', 'vehicle'] },
  { emoji: '🛵', name: 'motor scooter', category: 'travel', tags: ['scooter', 'vespa', 'travel', 'vehicle'] },
  { emoji: '🚲', name: 'bicycle', category: 'travel', tags: ['bike', 'bicycle', 'ride', 'travel', 'sports'] },
  { emoji: '✈️', name: 'airplane', category: 'travel', tags: ['plane', 'airplane', 'flight', 'travel', 'vacation'] },
  { emoji: '🚀', name: 'rocket', category: 'travel', tags: ['rocket', 'space', 'blastoff', 'fly', 'speed'] },
  { emoji: '🗺️', name: 'world map', category: 'travel', tags: ['map', 'travel', 'world', 'explore'] },
  { emoji: '🏖️', name: 'beach with umbrella', category: 'travel', tags: ['beach', 'umbrella', 'vacation', 'summer', 'sea'] },
  { emoji: '🏕️', name: 'camping', category: 'travel', tags: ['camp', 'tent', 'nature', 'outdoor'] },
  { emoji: '🏠', name: 'house', category: 'travel', tags: ['house', 'home', 'building', 'living'] },
  { emoji: '🏢', name: 'office building', category: 'travel', tags: ['office', 'building', 'work', 'corporate'] },
  { emoji: '🗼', name: 'tokyo tower', category: 'travel', tags: ['tower', 'tokyo', 'paris', 'landmark'] },
  { emoji: '🗽', name: 'statue of liberty', category: 'travel', tags: ['liberty', 'ny', 'america', 'landmark'] },
  { emoji: '🏰', name: 'castle', category: 'travel', tags: ['castle', 'disney', 'landmark', 'fantasy'] },

  // Objects & Symbols
  { emoji: '⌚', name: 'watch', category: 'objects', tags: ['watch', 'time', 'clock'] },
  { emoji: '📱', name: 'mobile phone', category: 'objects', tags: ['phone', 'iphone', 'mobile', 'smartphone', 'tech'] },
  { emoji: '💻', name: 'laptop', category: 'objects', tags: ['computer', 'laptop', 'macbook', 'tech', 'work'] },
  { emoji: '📷', name: 'camera', category: 'objects', tags: ['camera', 'photo', 'picture', 'shoot'] },
  { emoji: '💡', name: 'light bulb', category: 'objects', tags: ['light', 'bulb', 'idea', 'smart', 'inspiration'] },
  { emoji: '💵', name: 'dollar banknote', category: 'objects', tags: ['money', 'dollar', 'cash', 'green'] },
  { emoji: '✉️', name: 'envelope', category: 'objects', tags: ['mail', 'letter', 'envelope', 'message'] },
  { emoji: '✏️', name: 'pencil', category: 'objects', tags: ['pencil', 'write', 'draw', 'tool'] },
  { emoji: '🔑', name: 'key', category: 'objects', tags: ['key', 'lock', 'unlock', 'secret', 'password'] },
  { emoji: '🔒', name: 'locked', category: 'objects', tags: ['lock', 'locked', 'secure', 'safe'] },
  { emoji: '🎉', name: 'party popper', category: 'objects', tags: ['party', 'popper', 'celebrate', 'congrats', 'birthday'] },
  { emoji: '🎈', name: 'balloon', category: 'objects', tags: ['balloon', 'party', 'celebrate', 'birthday'] },
  { emoji: '🎁', name: 'wrapped gift', category: 'objects', tags: ['gift', 'present', 'birthday', 'christmas'] },
  { emoji: '💬', name: 'speech balloon', category: 'objects', tags: ['chat', 'bubble', 'message', 'talk'] },
  { emoji: '💯', name: 'hundred points', category: 'objects', tags: ['100', 'perfect', 'grade', 'score', 'excellent'] },
  { emoji: '⚠️', name: 'warning', category: 'objects', tags: ['warning', 'caution', 'danger', 'alert', 'error'] },
];

const CATEGORIES = [
  { id: 'recents', label: '🕒 Recents' },
  { id: 'smileys', label: '😀 Smileys' },
  { id: 'people', label: '👍 Gestures' },
  { id: 'nature', label: '🐶 Nature' },
  { id: 'food', label: '🍕 Food' },
  { id: 'activities', label: '⚽ Sports' },
  { id: 'travel', label: '🚗 Travel' },
  { id: 'objects', label: '💡 Objects' },
];

export default function EmojiPicker({ onSelectEmoji, onClose }) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('smileys');
  const [recents, setRecents] = useState([]);
  const pickerRef = useRef(null);

  // Load recents on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('chatapp_recent_emojis');
      if (stored) {
        setRecents(JSON.parse(stored));
        setActiveTab('recents'); // default to recents if they exist
      }
    } catch (e) {
      console.error('Failed to load recent emojis:', e);
    }
  }, []);

  // Listen for clicks outside the picker to close it
  useEffect(() => {
    const handleOutsideClick = (e) => {
      // If clicking the toggle button, let the toggle button's onClick handle it
      if (e.target.closest('[title="Insert emoji"]')) {
        return;
      }
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  // Handle emoji click
  const handleEmojiClick = (emoji) => {
    // Add to recents
    let updated = [emoji, ...recents.filter(x => x !== emoji)].slice(0, 21);
    setRecents(updated);
    try {
      localStorage.setItem('chatapp_recent_emojis', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    onSelectEmoji(emoji);
  };

  // Filter emojis based on active tab and search query
  const filteredEmojis = EMOJI_DATA.filter((item) => {
    // If there's a search query, search globally (ignoring categories)
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    // Otherwise, filter by category
    if (activeTab === 'recents') {
      return false; // Handled separately below
    }
    return item.category === activeTab;
  });

  // Decide what emojis to display
  const displayEmojis = (activeTab === 'recents' && !search.trim())
    ? recents
    : filteredEmojis;

  return (
    <div ref={pickerRef} style={styles.pickerContainer}>
      {/* Search Header */}
      <div style={styles.searchBar}>
        <input
          type="text"
          placeholder="Search emojis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
          autoFocus
        />
        {search && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setSearch('')}
            style={styles.searchClearBtn}
          >
            ✕
          </button>
        )}
      </div>

      {/* Tabs / Categories bar */}
      <div style={styles.tabsBar}>
        {CATEGORIES.map((tab) => {
          // If tab is recents, only show if we have recents OR if we are currently searching
          if (tab.id === 'recents' && recents.length === 0) return null;

          return (
            <button
              key={tab.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setActiveTab(tab.id);
                setSearch(''); // clear search when clicking a tab
              }}
              style={{
                ...styles.tabBtn,
                borderBottomColor: activeTab === tab.id && !search ? '#005153' : 'transparent',
                color: activeTab === tab.id && !search ? '#005153' : '#6e7979',
                fontWeight: activeTab === tab.id && !search ? '600' : '400',
              }}
              title={tab.label}
            >
              {tab.label.split(' ')[0]} {/* only show emoji on tab icon */}
            </button>
          );
        })}
      </div>

      {/* Emoji Grid Scroll Container */}
      <div style={styles.gridScroll}>
        {displayEmojis.length > 0 ? (
          <div style={styles.emojiGrid}>
            {displayEmojis.map((emojiObj, idx) => {
              const char = typeof emojiObj === 'string' ? emojiObj : emojiObj.emoji;
              const name = typeof emojiObj === 'string' ? '' : emojiObj.name;
              return (
                <button
                  key={`${char}-${idx}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleEmojiClick(char)}
                  style={styles.emojiBtn}
                  title={name}
                  aria-label={name}
                >
                  {char}
                </button>
              );
            })}
          </div>
        ) : (
          <div style={styles.noResults}>
            {activeTab === 'recents' && recents.length === 0
              ? 'No recently used emojis yet! ✨'
              : 'No matching emojis found 🧐'}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  pickerContainer: {
    position: 'absolute',
    bottom: '75px', // float nicely above the input bar
    left: '14px',
    width: '320px',
    height: '380px',
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(190, 201, 201, 0.7)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px 0 rgba(0, 81, 83, 0.12), 0 4px 12px 0 rgba(0, 0, 0, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 9999,
    overflow: 'hidden',
    animation: 'fadeInUp 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) both',
  },
  searchBar: {
    padding: '12px 14px 8px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    borderBottom: '1px solid rgba(190, 201, 201, 0.4)',
  },
  searchInput: {
    flex: 1,
    padding: '8px 14px',
    borderRadius: '999px',
    border: '1px solid rgba(190, 201, 201, 0.6)',
    background: '#f7f9fc',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
    color: '#191c1e',
    ':focus': {
      borderColor: '#005153',
      boxShadow: '0 0 0 2px rgba(0, 81, 83, 0.1)',
    }
  },
  searchClearBtn: {
    background: 'rgba(190, 201, 201, 0.3)',
    border: 'none',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    cursor: 'pointer',
    fontSize: '9px',
    color: '#3e4949',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
  },
  tabsBar: {
    display: 'flex',
    padding: '0 8px',
    background: '#f7f9fc',
    borderBottom: '1px solid rgba(190, 201, 201, 0.4)',
    overflowX: 'auto',
    scrollbarWidth: 'none', // Firefox
    msOverflowStyle: 'none', // IE 10+
    '::-webkit-scrollbar': {
      display: 'none', // Chrome/Safari/Webkit
    },
  },
  tabBtn: {
    padding: '8px 10px',
    background: 'none',
    border: 'none',
    borderBottom: '2.5px solid transparent',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.15s ease',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 14px',
  },
  emojiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '6px',
  },
  emojiBtn: {
    aspectRatio: '1/1',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    userSelect: 'none',
    outline: 'none',
    ':hover': {
      background: 'rgba(0, 81, 83, 0.08)',
      transform: 'scale(1.18)',
    },
    ':active': {
      transform: 'scale(0.9)',
    }
  },
  noResults: {
    textAlign: 'center',
    color: '#6e7979',
    fontSize: '12px',
    paddingTop: '40px',
  }
};
