package top.beichenhome.heritage;

import android.os.Bundle;
import android.webkit.WebSettings;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeSensorsPlugin.class);
        registerPlugin(NativeSurveyLocationPlugin.class);
        registerPlugin(AppUpdatePlugin.class);
        super.onCreate(savedInstanceState);
        // 固定 WebView 文字缩放，避免系统字体放大打乱页面布局；
        // 字体大小改由应用内「我的 - 外观设置」统一调节。
        WebSettings settings = this.bridge.getWebView().getSettings();
        settings.setTextZoom(100);
    }
}
