"use strict";

chrome.runtime.sendMessage(
  {
    type: "prefs.get",
    key: "show_devtools_panel"
  },
  function(enabled)
  {
    if (enabled)
      chrome.devtools.panels.create("AdBlock",
                                    "icons/ab-48.png",
                                    "devtools-panel.html");
  }
);
