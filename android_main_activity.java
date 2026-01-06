package com.planner.app;

import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Настройка WebView для работы с локальными файлами
        WebView webView = getBridge().getWebView();
        WebSettings webSettings = webView.getSettings();
        
        // Включаем JavaScript
        webSettings.setJavaScriptEnabled(true);
        
        // Разрешаем доступ к локальным файлам
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        
        // Включаем DOM Storage
        webSettings.setDomStorageEnabled(true);
        
        // Настройка для работы с Flask локально
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        
        // Загружаем локальный сервер Flask
        // Flask должен быть запущен на localhost:5000
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return false;
            }
        });
    }
}


