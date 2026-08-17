/** @type {import('detox').DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 300000,
    },
  },
  apps: {
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build:
        'android\\gradlew.bat -p android assembleDebug assembleAndroidTest -DtestBuildType=debug -PreactNativeArchitectures=x86_64',
      reversePorts: [8081],
      // New Architecture(Fabric)下 Detox 的同步机制会死锁/断连，测试时禁用它
      launchArgs: { detoxEnableSynchronization: 0 },
    },
  },
  devices: {
    emulator: {
      type: 'android.emulator',
      device: { avdName: 'ClassordTest' },
    },
  },
  configurations: {
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
  },
};
