App.accessRule('https://www.skishore.me/inkstone/*');
App.info({
  name: 'Inkstone',
  description: 'Learn to write Chinese characters.',
  version: '0.1.4'
});
App.setPreference('orientation', 'portrait');
App.appendToConfig(`
  <platform name="android">
    <hook src="hooks/copy-build-extras-gradle.js" type="before_build" />
  </platform>`);
