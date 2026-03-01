const { withAndroidManifest } = require('@expo/config-plugins');

const withAndroidWidgets = (config) => {
  // Add widget receivers to AndroidManifest
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    
    if (!manifest.application) {
      return config;
    }
    
    const mainApplication = manifest.application[0];
    
    if (!mainApplication.receiver) {
      mainApplication.receiver = [];
    }
    
    // Add Quick Capture widget provider
    mainApplication.receiver.push({
      '$': {
        'android:name': 'com.claw.app.widget.QuickCaptureWidgetProvider',
        'android:exported': 'true',
        'android:label': 'CLAW Quick Capture'
      },
      'intent-filter': [{
        action: [{ '$': { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }]
      }],
      'meta-data': [{
        '$': {
          'android:name': 'android.appwidget.provider',
          'android:resource': '@xml/quick_capture_widget_info'
        }
      }]
    });
    
    // Add Strike Now widget provider
    mainApplication.receiver.push({
      '$': {
        'android:name': 'com.claw.app.widget.StrikeNowWidgetProvider',
        'android:exported': 'true',
        'android:label': 'CLAW Strike Now'
      },
      'intent-filter': [{
        action: [{ '$': { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }]
      }],
      'meta-data': [{
        '$': {
          'android:name': 'android.appwidget.provider',
          'android:resource': '@xml/strike_now_widget_info'
        }
      }]
    });
    
    return config;
  });
  
  return config;
};

module.exports = withAndroidWidgets;
