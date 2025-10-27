chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'notify') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'CSFloat Snipe Found!',
      message: msg.message
    });
  }
});
