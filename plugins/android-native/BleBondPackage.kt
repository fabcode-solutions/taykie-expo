package com.taykie.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

// Registers both small BLE-support native modules (bonding + the
// foreground-service bridge) — kept in one package rather than one each to
// avoid a second near-identical ReactPackage registration in MainApplication.
class BleBondPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(BleBondModule(reactContext), BleForegroundServiceModule(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
