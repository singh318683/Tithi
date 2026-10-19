# Keep the methods the web page calls through window.TithiAndroid
-keepclassmembers class com.ikshana.tithi.TithiBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
