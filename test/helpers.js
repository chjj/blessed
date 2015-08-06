var blessed = require('../'),
    screen = blessed.screen();

console.log(blessed.helpers.parseTags('{red-fg}This should be red.{/red-fg}'));
console.log(blessed.helpers.parseTags('{green-bg}This should have a green background.{/green-bg}'));
