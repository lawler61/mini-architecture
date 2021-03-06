package com.my.mini_demo.lib.main;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.constraintlayout.widget.ConstraintLayout;

import com.my.mini_demo.R;
import com.my.mini_demo.lib.api.ApiManager;
import com.my.mini_demo.lib.config.AppConfig;
import com.my.mini_demo.lib.interfaces.OnEventListener;
//import com.my.mini_demo.lib.service.AppService;
import com.my.mini_demo.lib.service.AppService2;
import com.my.mini_demo.lib.utils.FileUtil;

import java.util.Objects;

public class MiniActivity extends AppCompatActivity implements OnEventListener {
    public static final String APP_ID = "app_id";
    public static final String USER_ID = "user_id";
    public static final String APP_PATH = "app_path";

    private ConstraintLayout mLayout;
    private AppConfig mAppConfig;
    private ApiManager mApiManager;
//    private AppService mAppService; // 改 loadPage，onDestroy
    private AppService2 mAppService;
    private PageManager mPageManager;


    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Intent intent = getIntent();
        String appId = intent.getStringExtra(APP_ID);
        String userId = intent.getStringExtra(USER_ID);
        String appPath = intent.getStringExtra(APP_PATH);

        Log.d("MiniDemo", userId + " open " + appId);
        mAppConfig = new AppConfig(appId, userId);
        mApiManager = new ApiManager(this, this, mAppConfig);
        mApiManager.onCreate();

        Objects.requireNonNull(getSupportActionBar()).hide();
        setContentView(R.layout.activity_mini);

        mLayout = findViewById(R.id.mini);

        // 加载小程序内容
        FileUtil.loadMiniApp(this, appId, appPath, new FileUtil.LoadFileCallback() {
            @Override
            public void onResult(boolean result) {
                if (!result) {
                    finish();
                } else {
                    loadPage();
                }
            }
        });
    }

    private void loadPage() {
//        mAppService = new AppService(this, this, mAppConfig, mApiManager);
//        mLayout.addView(mAppService, new ConstraintLayout.LayoutParams(ConstraintLayout.LayoutParams.MATCH_PARENT,
//                 ConstraintLayout.LayoutParams.MATCH_PARENT));

        mPageManager = new PageManager(this, this, mAppConfig);
        mLayout.addView(mPageManager.getContainer(), new ConstraintLayout.LayoutParams(ConstraintLayout.LayoutParams.MATCH_PARENT,
                ConstraintLayout.LayoutParams.MATCH_PARENT));

        mAppService = new AppService2(this, this, mAppConfig, mApiManager);
    }

    // service publish serviceReady
    @Override
    public void onServiceReady() {
        mPageManager.launchHomePage(mAppConfig.getRootPath(), "appLaunch");
    }

    @Override
    public void notifyPageSubscribers(String event, String params, int viewId) {
        mPageManager.subscribeHandler(event, params, viewId);
    }

    @Override
    public void notifyServiceSubscribers(String event, String params, int viewId) {
        mAppService.subscribeHandler(event, params, viewId);
    }

    @Override
    public boolean onPageEvent(String event, String params) {
        return mPageManager.pageEventHandler(event, params);
    }

    @Override
    protected void onDestroy() {
        mApiManager.onDestroy();
        mAppService.onDestroy();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (mPageManager != null && mPageManager.navigateBackPage(1)) {
            return;
        }
        super.onBackPressed();
    }
}
