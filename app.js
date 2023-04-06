// wait for the DOM to finish loading
$(document).ready(function() {
  console.log("ready!");
  /* particlesJS.load(@dom-id, @path-json, @callback (optional)); */
  particlesJS.load("particles-js", "particles.json", function () {
    console.log("callback - particles.js config loaded");
  });

});
