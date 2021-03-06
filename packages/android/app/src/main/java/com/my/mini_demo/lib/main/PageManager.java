package com.my.mini_demo.lib.main;

import android.content.Context;
import android.util.Log;
import android.widget.FrameLayout;

import com.my.mini_demo.lib.config.AppConfig;
import com.my.mini_demo.lib.interfaces.OnEventListener;
import com.my.mini_demo.lib.page.MiniPage;
import com.my.mini_demo.lib.utils.JsonUtil;

public class PageManager {

    private Context mContext;
    private OnEventListener mListener;
    private AppConfig mAppConfig;
    private FrameLayout mContainer;

    public PageManager(Context context, OnEventListener listener, AppConfig appConfig) {
        mContext = context;
        mListener = listener;
        mAppConfig = appConfig;
        // 用于 add page（包括 title 和 webview）
        mContainer = new FrameLayout(context);
    }

    public FrameLayout getContainer() {
        return mContainer;
    }

    private int getPageCount() {
        return mContainer.getChildCount();
    }

    private MiniPage createPage(String url) {
        MiniPage page = new MiniPage(mContext, url, mAppConfig);
        page.setEventListener(mListener);

        // TODO: preload Page
        mContainer.addView(page, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));
        return page;
    }

    private MiniPage getTopPage() {
        int count = getPageCount();

        if (count <= 0) {
            return null;
        }
        return (MiniPage) mContainer.getChildAt(count - 1);
    }

    public boolean launchHomePage(String url, String openType) {
        mContainer.removeAllViews();
        MiniPage page = createPage(url);
        return page.loadUrl(url, openType);
    }

    private boolean navigateToPage(String url) {
        MiniPage page = createPage(url);
        return page.loadUrl(url, "navigateTo");
    }

    public boolean navigateBackPage(int delta) {
        if (!removePages(delta)) {
            return false;
        }

        MiniPage page = getTopPage();
        if (page == null) {
            return false;
        }
        // 获取 back 到的界面并显示
        return page.onNavigateBack();
    }

    private boolean redirectToPage(String url) {
        MiniPage page = getTopPage();
        if (page == null) {
            return false;
        }
        return page.loadUrl(url, "redirectTo");
    }

    private boolean setNavigationBarTitle(String title) {
        MiniPage page = getTopPage();

        if (page == null) {
            return false;
        }
        page.setNavigationBarTitle(title);
        return true;
    }

    public void subscribeHandler(String event, String params, int viewId) {
        int count = getPageCount();
        for (int i = 0; i < count; i++) {
            MiniPage page = (MiniPage) mContainer.getChildAt(i);
            page.subscribeHandler(event, params, viewId);
        }
    }

    public boolean pageEventHandler(String event, String params) {
        if ("navigateTo".equals(event)) {
            String path = JsonUtil.getStringValue(params, "url", "");
            return navigateToPage(path + ".html");

        } else if ("navigateBack".equals(event)) {
            return navigateBackPage(JsonUtil.getIntValue(params, "delta", 1));

        } else if ("redirectTo".equals(event)) {
            String path = JsonUtil.getStringValue(params, "url", "");
            return redirectToPage(path + ".html");

        } else if ("reLaunch".equals(event)) {
            String path = JsonUtil.getStringValue(params, "url", "");
            return launchHomePage(path + ".html", event);

        } else if ("setNavigationBarTitle".equals(event)) {
            return setNavigationBarTitle(JsonUtil.getStringValue(params, "title", ""));
        }
        return false;
    }

    private boolean removePages(int delta) {
        int count = getPageCount();

        if (delta <= 0 || delta >= count) {
            Log.e("MiniDemo", "removePages by delta " + delta + " stopped, current page count " + count);
            return false;
        }

        for (int i = count - delta; i < count; i++) {
            mContainer.removeViewAt(i);
        }
        return true;
    }
}
