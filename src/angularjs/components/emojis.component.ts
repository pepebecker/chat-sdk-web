import * as angular from 'angular';

import { Emoji } from '../services/emoji';


class EmojiController {

  static $inject = ['Emoji', '$scope'];

  emoji: Emoji;
  emojis: string[];

  // Bindings
  text: string;

  constructor(public Emoji: Emoji) {
    this.emoji = this.Emoji;
    this.emojis = this.emoji.getEmojis();
  }

  addEmoji(text: string): void {
    if (!this.text) {
      this.text = '';
    }
    this.text += text;
  }

}

angular.module('myApp.components').component('emojis', {
  templateUrl: '/assets/partials/emojis.html',
  controller: EmojiController,
  controllerAs: 'ctrl',
  bindings: {
    text: '='
  }
});
