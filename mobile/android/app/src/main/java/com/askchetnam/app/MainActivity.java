package com.askchetnam.app;

import com.getcapacitor.BridgeActivity;

/**
 * Deliberately empty.
 *
 * A WebChromeClient override was written here to forward microphone requests
 * from the page to Android, and then removed: Capacitor's own
 * BridgeWebChromeClient already does exactly that, requesting RECORD_AUDIO and
 * MODIFY_AUDIO_SETTINGS at runtime and granting the WebView on success. The
 * override replaced correct behaviour with worse, and subclassing the chrome
 * client wrongly would have broken the bridge alongside it.
 *
 * The only thing dictation needed on Android was the two permissions declared
 * in AndroidManifest.xml — without those, Capacitor's runtime request fails
 * before any dialog appears.
 */
public class MainActivity extends BridgeActivity {}
