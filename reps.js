// reps.js — v1
// Single source of truth for the rep roster, shared by counter.html and
// sales-review.html. To add a rep: add one entry to REPS and one slug to
// ORDER below. That's it for these two files.
//
// bump.js (a Vercel serverless function, can't load this browser file the
// same way) keeps its own short whitelist array \u2014 update that too when
// adding a rep. Everything else (extract.js, Code.gs) doesn't need to know
// the rep list at all.

var REPS  = { logan: 'Logan McLean', brycen: 'Brycen Perkins', sami: 'Sami Layadi', connor: 'Connor McLean', jacob: 'Jacob Denver' };
var ORDER = ['logan', 'brycen', 'sami', 'connor', 'jacob'];
