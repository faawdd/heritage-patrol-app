if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const promise = this.constructor;
    return this.then(
      (value) => promise.resolve(callback()).then(() => value),
      (reason) => promise.resolve(callback()).then(() => {
        throw reason;
      })
    );
  };
}
;
if (typeof uni !== "undefined" && uni && uni.requireGlobal) {
  const global = uni.requireGlobal();
  ArrayBuffer = global.ArrayBuffer;
  Int8Array = global.Int8Array;
  Uint8Array = global.Uint8Array;
  Uint8ClampedArray = global.Uint8ClampedArray;
  Int16Array = global.Int16Array;
  Uint16Array = global.Uint16Array;
  Int32Array = global.Int32Array;
  Uint32Array = global.Uint32Array;
  Float32Array = global.Float32Array;
  Float64Array = global.Float64Array;
  BigInt64Array = global.BigInt64Array;
  BigUint64Array = global.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  const PROD_API_BASE_URL = "https://beichenhome.top:9081/app-api";
  const API_BASE_URL = PROD_API_BASE_URL;
  const WEB_BASE_URL = "https://beichenhome.top:9081";
  const config = {
    API_BASE_URL,
    WEB_BASE_URL
  };
  const TOKEN_KEY = "heritage_app_token";
  const USER_KEY = "heritage_app_user";
  function setSession(token, user) {
    uni.setStorageSync(TOKEN_KEY, token);
    uni.setStorageSync(USER_KEY, JSON.stringify(user || {}));
  }
  function getToken() {
    return uni.getStorageSync(TOKEN_KEY) || "";
  }
  function getUser() {
    const raw = uni.getStorageSync(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }
  function clearSession() {
    uni.removeStorageSync(TOKEN_KEY);
    uni.removeStorageSync(USER_KEY);
  }
  function isAdminUser(user) {
    if (!user) {
      return false;
    }
    return !!user.is_admin || user.role === "管理员" || user.role === "超级管理员";
  }
  function getAuthHeader() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  const pageTitleKeys = {
    index: "nav.app",
    home: "nav.home",
    patrol: "nav.patrol",
    records: "nav.records",
    my: "nav.my",
    about: "nav.about",
    admin: "nav.admin",
    kml: "nav.kml"
  };
  const roleKeyMap = {
    管理员: "roles.admin",
    超级管理员: "roles.superAdmin",
    看护员: "roles.patrol"
  };
  const workflowKeyMap = {
    received: "workflow.received",
    ovital_checked: "workflow.ovitalChecked",
    site_surveyed: "workflow.siteSurveyed",
    application_submitted: "workflow.applicationSubmitted",
    bureau_approved: "workflow.bureauApproved",
    replied_to_project: "workflow.repliedToProject",
    archived: "workflow.archived"
  };
  const messages = {
    app: {
      brand: "鄯善文保"
    },
    common: {
      notAvailable: "暂无",
      none: "无",
      unknown: "未知",
      notFilled: "未填写",
      notLinked: "未关联",
      loading: "加载中",
      cancel: "取消",
      search: "搜索"
    },
    nav: {
      app: "鄯善文保",
      home: "实时统计",
      patrol: "文物巡查",
      records: "巡查记录",
      my: "我的账户",
      about: "关于此软件",
      admin: "管理中心",
      kml: "KML叠加检查"
    },
    bottomNav: {
      home: "工作台",
      patrol: "巡查上报",
      records: "巡查记录",
      admin: "管理中心",
      my: "我的账户"
    },
    roles: {
      admin: "管理员",
      superAdmin: "超级管理员",
      patrol: "看护员",
      unknown: "未知"
    },
    login: {
      usernamePlaceholder: "请输入账号",
      passwordPlaceholder: "请输入密码",
      submit: "登录",
      missingCredentials: "请输入用户名和密码",
      success: "登录成功",
      failed: "登录失败",
      serverUnavailable: "无法连接服务端"
    },
    home: {
      adminDashboard: "管理工作台",
      patrolDashboard: "巡查工作台",
      guestUser: "未登录用户",
      startPatrol: "开始巡查",
      nearestSite: "最近文物点",
      noAddress: "暂无地址",
      distanceKm: "距离 {distance} km",
      nearestAutoPicked: "已为你选取最近文物点",
      locating: "正在定位并查找最近文物点...",
      totalSites: "文物总数",
      todayInspections: "今日巡查",
      pendingProjects: "待办项目",
      features: "功能入口",
      featurePatrol: "巡查上报",
      featureRecords: "巡查记录",
      featureHeritages: "文物管理",
      featureCollectManage: "采集数据管理",
      featureProjects: "项目管理",
      featureKml: "KML检查",
      featureMy: "我的账户",
      featureBuilding: "功能建设中",
      locationFailedName: "定位失败",
      locationFailedAddress: "请在巡查页手动选择文物点",
      noMatchedSite: "暂无匹配文物点",
      loadFailedName: "加载失败",
      checkNetwork: "请检查网络",
      loadDataFailed: "数据加载失败"
    },
    patrol: {
      heroLabel: "巡查工作区",
      notLoggedInUser: "未登录用户",
      currentRole: "当前角色：{role}",
      heroDesc: "看护员可提交巡查记录；管理员和超级管理员同时可进入管理功能。",
      locationInfo: "定位信息",
      longitude: "经度",
      latitude: "纬度",
      nearestSite: "最近文物点",
      selectedSite: "已选择文物点",
      noAddressInfo: "暂无地址信息",
      searching: "正在查找...",
      manualTitle: "手动选择巡查文物点",
      manualCopy: "定位不可用时可搜索文物点并手动选择，再继续拍照巡查。",
      manualSearchPlaceholder: "输入名称/编号/地址",
      manualNoResult: "暂无匹配文物点",
      actionTitle: "巡查操作",
      actionCopy: "拍照后会自动叠加用户、文物点、时间和经纬度水印，再上传巡查记录。",
      siteStatus: "文物点状态",
      normal: "正常",
      problem: "存在问题",
      problemRequiredPlaceholder: "请填写问题说明（必填）",
      problemOptionalPlaceholder: "可填写补充说明（选填）",
      problemHint: "状态为存在问题时，问题说明必填",
      takePhoto: "拍照并生成巡查记录",
      previewTitle: "图片预览",
      confirmUpload: "确认上传",
      locating: "正在获取...",
      unknownLocation: "未知地点",
      locationFailedManual: "定位失败，请手动选择文物点",
      locationFailedToast: "获取位置失败",
      nearbyNotFound: "未找到附近的文物点",
      nearbyFailed: "查找失败，请检查网络",
      loadingSites: "正在加载文物点...",
      noSelectableSites: "暂无可选文物点",
      selectPatrolSite: "请选择巡查文物点",
      noCode: "无编号",
      selectedSiteFormat: "{name}（{code}）",
      manualSelected: "手动选择",
      manualSelectedAddress: "{name}（手动选择）",
      selectedToast: "已选择：{name}",
      selectSiteFirst: "请先确定文物点",
      watermarkTime: "时间",
      watermarkUser: "用户",
      watermarkSite: "文物点",
      watermarkLocation: "地点",
      watermarkCoord: "经纬度",
      unselectedSiteName: "未选择文物点",
      watermarkFailed: "水印失败，已使用原图",
      shootPhotoFirst: "请先拍照",
      fillIssueDetails: "请填写问题说明",
      uploadSuccess: "上传成功",
      uploadFailed: "上传失败",
      uploadFailedNetwork: "上传失败，请检查网络"
    },
    records: {
      heroLabel: "巡查记录",
      title: "巡查记录",
      subtitle: "查看本人提交过的巡查记录，包含时间、文物点、巡查状态和现场照片。",
      submittedRecords: "已提交记录",
      emptyTitle: "还没有巡查记录",
      emptyCopy: "完成一次巡查并上传后，记录会显示在这里。",
      normal: "正常",
      abnormal: "异常",
      issueLabel: "问题说明：{detail}",
      coordLabel: "坐标：{longitude}，{latitude}",
      loadFailed: "记录加载失败"
    },
    my: {
      heroLabel: "我的账户",
      title: "我的",
      subtitle: "账号信息与安全设置",
      fullName: "姓名",
      username: "用户名",
      role: "角色",
      changePassword: "修改密码",
      currentPassword: "当前密码",
      newPassword: "新密码（至少6位）",
      confirmPassword: "确认新密码",
      saving: "提交中...",
      saveNewPassword: "保存新密码",
      logout: "退出账号",
      loadMe: "加载中",
      fillPasswordInfo: "请完整填写密码信息",
      newPasswordMin: "新密码至少6位",
      passwordMismatch: "两次输入的新密码不一致",
      passwordSuccess: "密码修改成功",
      passwordFailed: "密码修改失败",
      loggedOut: "已退出账号",
      aboutSoftware: "关于此软件",
      aboutSoftwareDesc: "查看作者、版本信息与使用说明",
      openAboutSoftware: "打开关于页面",
      openAboutFailed: "打开关于页面失败"
    },
    about: {
      heroLabel: "关于软件",
      title: "关于此软件",
      subtitle: "系统信息与使用说明",
      authorLabel: "作者",
      authorValue: "北辰",
      contactLabel: "联系方式",
      contactValue: "如有建议或者报错可联系：\n手机：13899665458\n邮箱：w1443469207@163.com",
      versionLabel: "版本",
      versionValue: "1.0.0",
      noteLabel: "添加说明",
      noteValue: "该软件仅供内部使用"
    },
    admin: {
      heroLabel: "管理控制台",
      title: "管理中心",
      subtitle: "管理员和超级管理员可查看全部文物点、编辑项目并进入 KML 叠加检查。",
      tabHeritages: "文物点数据",
      tabProjects: "项目管理",
      tabTools: "工具入口",
      allHeritages: "全部文物点",
      searchHeritagePlaceholder: "输入名称/编号/地址关键词",
      allCategoriesOption: "全部类型",
      resetFilters: "重置筛选",
      filterResultSummary: "共找到 {count} 条，当前第 {page} 页",
      noHeritageMatched: "暂无匹配文物点",
      recordCount: "{count} 条",
      sipCode: "四普编号：{value}",
      categoryLevel: "类别：{category} | 级别：{level}",
      address: "地址：{value}",
      coordinates: "坐标：{longitude}, {latitude}",
      prevPage: "上一页",
      nextPage: "下一页",
      pageInfo: "第 {page} / {total} 页",
      projectsTitle: "项目管理",
      projectUnit: "项目单位：{value}",
      relatedSite: "关联文物：{value}",
      conclusion: "结论：{value}",
      editProjectInfo: "编辑项目信息",
      editProjectTitle: "编辑项目：{name}",
      projectNamePlaceholder: "项目名称",
      projectUnitPlaceholder: "项目单位",
      currentStatus: "当前状态：{value}",
      selectStatus: "请选择",
      constructionContentPlaceholder: "工程建设内容与地址",
      projectScalePlaceholder: "项目规模",
      projectCoordinatesPlaceholder: "项目选址经纬度坐标文本",
      projectLongitudePlaceholder: "项目经度",
      projectLatitudePlaceholder: "项目纬度",
      surveyConclusionPlaceholder: "勘察结论",
      remarksPlaceholder: "备注",
      saveChanges: "保存修改",
      kmlTitle: "KML 叠加检查",
      kmlDesc: "该功能复用现有 Django 网页工具。管理员可直接从 App 进入工具页面。",
      openKml: "打开 KML 叠加检查",
      noAdminPermission: "无管理员权限",
      adminDataLoadFailed: "管理员数据加载失败",
      loadingHeritages: "加载文物点中",
      loadingProjects: "加载项目中",
      projectUpdated: "项目已更新",
      saveFailed: "保存失败",
      toolAddressMissing: "未获取到工具地址",
      openFailed: "打开失败"
    },
    workflow: {
      received: "已接收查询函",
      ovitalChecked: "奥维查询完成",
      siteSurveyed: "现场勘察完成",
      applicationSubmitted: "已上报市文物局",
      bureauApproved: "市局审批完成",
      repliedToProject: "已回函项目方",
      archived: "归档完成"
    },
    kml: {
      heroLabel: "空间工具",
      title: "KML 叠加检查",
      subtitle: "已切换为更简洁的工具页样式。页面将复用现有 Django 网页能力，并优先使用 App 的桥接登录。"
    }
  };
  function getMessageValue(key) {
    const segments = key.split(".");
    let current = messages;
    for (let i = 0; i < segments.length; i += 1) {
      if (!current || typeof current !== "object") {
        return "";
      }
      current = current[segments[i]];
    }
    return current;
  }
  function formatMessage(template, params) {
    if (typeof template !== "string") {
      return template;
    }
    return template.replace(/\{(\w+)\}/g, (match, token) => {
      if (params && Object.prototype.hasOwnProperty.call(params, token)) {
        return params[token];
      }
      return match;
    });
  }
  function t(key, params = {}) {
    const value = getMessageValue(key);
    if (value !== void 0 && value !== "") {
      return formatMessage(value, params);
    }
    return key;
  }
  function getPageTitle(pageKey) {
    const titleKey = pageTitleKeys[pageKey] || "nav.app";
    return t(titleKey);
  }
  function getRoleLabel(role) {
    if (!role) {
      return t("roles.unknown");
    }
    const roleKey = roleKeyMap[role];
    if (roleKey) {
      return t(roleKey);
    }
    return role;
  }
  function getWorkflowLabel(status) {
    const workflowKey = workflowKeyMap[status];
    if (workflowKey) {
      return t(workflowKey);
    }
    return status || "";
  }
  function createPageI18n(pageKey) {
    return {
      created() {
        this.$nextTick(() => {
          this.updateNavigationTitle();
        });
      },
      onShow() {
        this.updateNavigationTitle();
      },
      methods: {
        t(key, params) {
          return t(key, params);
        },
        updateNavigationTitle() {
          uni.setNavigationBarTitle({
            title: getPageTitle(pageKey)
          });
        }
      }
    };
  }
  const _imports_0 = "/static/1.png";
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const _sfc_main$c = {
    mixins: [createPageI18n("index")],
    data() {
      return {
        loading: false,
        appVersion: "v1.0.0",
        form: {
          username: "",
          password: ""
        }
      };
    },
    onLoad() {
      if (typeof plus !== "undefined" && plus.runtime && plus.runtime.version) {
        this.appVersion = `v${plus.runtime.version}`;
      }
      if (getToken()) {
        uni.reLaunch({ url: "/pages/home/home" });
      }
    },
    methods: {
      handleLogin() {
        if (!this.form.username || !this.form.password) {
          uni.showToast({ title: this.t("login.missingCredentials"), icon: "none" });
          return;
        }
        this.loading = true;
        uni.request({
          url: `${config.API_BASE_URL}/api/auth/login`,
          method: "POST",
          data: this.form,
          header: {
            "Content-Type": "application/json"
          },
          success: (res) => {
            if (res.statusCode === 200 && res.data && res.data.token) {
              setSession(res.data.token, res.data.user);
              uni.showToast({ title: this.t("login.success"), icon: "success" });
              setTimeout(() => {
                uni.reLaunch({ url: "/pages/home/home" });
              }, 300);
              return;
            }
            uni.showToast({ title: res.data && res.data.detail || this.t("login.failed"), icon: "none" });
          },
          fail: () => {
            uni.showToast({ title: this.t("login.serverUnavailable"), icon: "none" });
          },
          complete: () => {
            this.loading = false;
          }
        });
      },
      handleForgotPassword() {
        uni.showModal({
          title: "忘记密码",
          content: "请联系管理员\n联系电话：13899665458",
          showCancel: false,
          confirmText: "知道了"
        });
      }
    }
  };
  function _sfc_render$b(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createElementVNode("view", { class: "login-wrap" }, [
        vue.createElementVNode("view", { class: "brand" }, [
          vue.createElementVNode("view", { class: "brand-halo" }, [
            vue.createElementVNode("image", {
              class: "brand-icon",
              src: _imports_0,
              mode: "aspectFit"
            })
          ]),
          vue.createElementVNode(
            "text",
            { class: "brand-title" },
            vue.toDisplayString(_ctx.t("app.brand")),
            1
            /* TEXT */
          ),
          vue.createElementVNode("text", { class: "brand-sub" }, "文物保护巡查管理系统")
        ]),
        vue.createElementVNode("view", { class: "form-card" }, [
          vue.createElementVNode("view", { class: "card-top-shine" }),
          vue.createElementVNode("view", { class: "input-field" }, [
            vue.createElementVNode("image", {
              class: "field-icon",
              mode: "aspectFit",
              src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='8' r='3.5' fill='%23163F77'/%3E%3Cpath fill='%23163F77' d='M4 20c0-4 3.58-7 8-7s8 3 8 7H4z'/%3E%3C/svg%3E"
            }),
            vue.createElementVNode("view", { class: "field-sep" }),
            vue.withDirectives(vue.createElementVNode("input", {
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.form.username = $event),
              class: "field-input",
              placeholder: _ctx.t("login.usernamePlaceholder"),
              "placeholder-class": "field-ph"
            }, null, 8, ["placeholder"]), [
              [vue.vModelText, $data.form.username]
            ])
          ]),
          vue.createElementVNode("view", { class: "input-field" }, [
            vue.createElementVNode("image", {
              class: "field-icon",
              mode: "aspectFit",
              src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect x='5' y='11' width='14' height='10' rx='2' fill='%23163F77'/%3E%3Cpath d='M8 11V7a4 4 0 0 1 8 0v4' fill='none' stroke='%23163F77' stroke-width='2.2' stroke-linecap='round'/%3E%3Ccircle cx='12' cy='16' r='1.3' fill='white'/%3E%3C/svg%3E"
            }),
            vue.createElementVNode("view", { class: "field-sep" }),
            vue.withDirectives(vue.createElementVNode("input", {
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.form.password = $event),
              class: "field-input",
              password: "",
              placeholder: _ctx.t("login.passwordPlaceholder"),
              "placeholder-class": "field-ph"
            }, null, 8, ["placeholder"]), [
              [vue.vModelText, $data.form.password]
            ])
          ]),
          vue.createElementVNode("view", { class: "btn-row" }, [
            vue.createElementVNode("button", {
              class: "login-btn",
              loading: $data.loading,
              onClick: _cache[2] || (_cache[2] = (...args) => $options.handleLogin && $options.handleLogin(...args))
            }, vue.toDisplayString(_ctx.t("login.submit")), 9, ["loading"])
          ]),
          vue.createElementVNode("view", { class: "forgot-row" }, [
            vue.createElementVNode("text", {
              class: "forgot-link",
              onClick: _cache[3] || (_cache[3] = (...args) => $options.handleForgotPassword && $options.handleForgotPassword(...args))
            }, "忘记密码？")
          ]),
          vue.createElementVNode("view", { class: "version-row" }, [
            vue.createElementVNode(
              "text",
              { class: "version-text" },
              "App " + vue.toDisplayString($data.appVersion),
              1
              /* TEXT */
            )
          ])
        ])
      ])
    ]);
  }
  const PagesIndexIndex = /* @__PURE__ */ _export_sfc(_sfc_main$c, [["render", _sfc_render$b], ["__file", "C:/Users/14434/uniapp/pages/index/index.vue"]]);
  const _sfc_main$b = {
    name: "BottomNav",
    props: {
      current: {
        type: String,
        default: "home"
      },
      userInfo: {
        type: Object,
        default: null
      }
    },
    data() {
      return {
        user: this.userInfo || getUser() || {}
      };
    },
    watch: {
      userInfo: {
        deep: true,
        handler(value) {
          if (value) {
            this.user = value;
          }
        }
      }
    },
    computed: {
      isAdmin() {
        if (!this.user) {
          return false;
        }
        return !!this.user.is_admin || this.user.role === "管理员" || this.user.role === "超级管理员";
      },
      navItems() {
        const items = [
          { key: "home", name: this.t("bottomNav.home"), url: "/pages/home/home" },
          { key: "patrol", name: this.t("bottomNav.patrol"), url: "/pages/patrol/patrol" },
          { key: "records", name: this.t("bottomNav.records"), url: "/pages/records/records" }
        ];
        if (this.isAdmin) {
          items.push({ key: "admin", name: this.t("bottomNav.admin"), url: "/pages/admin/admin" });
        }
        items.push({ key: "my", name: this.t("bottomNav.my"), url: "/pages/my/my" });
        return items;
      }
    },
    methods: {
      t(key, params) {
        return t(key, "zh");
      },
      go(url, key) {
        if (this.current === key) {
          return;
        }
        uni.reLaunch({ url });
      }
    }
  };
  function _sfc_render$a(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock(
      "view",
      {
        class: vue.normalizeClass(["bottom-nav", $options.navItems.length > 4 ? "bottom-nav-compact" : ""])
      },
      [
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($options.navItems, (item) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              key: item.key,
              class: vue.normalizeClass(["nav-item", $props.current === item.key ? "active" : ""]),
              onClick: ($event) => $options.go(item.url, item.key)
            }, [
              vue.createElementVNode("view", { class: "nav-icon-shell" }, [
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["nav-icon", `nav-icon-${item.key}`])
                  },
                  null,
                  2
                  /* CLASS */
                )
              ]),
              vue.createElementVNode(
                "text",
                { class: "nav-text" },
                vue.toDisplayString(item.name),
                1
                /* TEXT */
              )
            ], 10, ["onClick"]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ],
      2
      /* CLASS */
    );
  }
  const BottomNav = /* @__PURE__ */ _export_sfc(_sfc_main$b, [["render", _sfc_render$a], ["__scopeId", "data-v-53d1cde7"], ["__file", "C:/Users/14434/uniapp/components/BottomNav.vue"]]);
  const featureDefinitions = [
    { key: "patrol", labelKey: "home.featurePatrol", icon: "巡", url: "/pages/patrol/patrol" },
    { key: "records", labelKey: "home.featureRecords", icon: "记", url: "/pages/records/records" },
    { key: "heritages", labelKey: "home.featureHeritages", icon: "文", url: "/pages/admin/admin" },
    { key: "collectManage", labelKey: "home.featureCollectManage", icon: "采", url: "/pages/collect/my_records" },
    { key: "projects", labelKey: "home.featureProjects", icon: "项", url: "/pages/admin/admin?tab=projects" },
    { key: "kml", labelKey: "home.featureKml", icon: "图", url: "/pages/kml/kml" },
    { key: "my", labelKey: "home.featureMy", icon: "我", url: "/pages/my/my" }
  ];
  const _sfc_main$a = {
    mixins: [createPageI18n("home")],
    components: {
      BottomNav
    },
    data() {
      return {
        user: {},
        location: {
          latitude: 0,
          longitude: 0
        },
        nearestSite: null,
        adminStats: {
          totalSites: 0,
          todayInspections: 0,
          pendingProjects: 0
        }
      };
    },
    computed: {
      adminFeatures() {
        return featureDefinitions.map((item) => ({
          ...item,
          name: this.t(item.labelKey)
        }));
      },
      userRole() {
        if (!this.user) {
          return "patrol";
        }
        if (this.user.is_admin || this.user.role === "管理员" || this.user.role === "超级管理员") {
          return "admin";
        }
        return "patrol";
      }
    },
    onLoad() {
      if (!getToken()) {
        uni.reLaunch({ url: "/pages/index/index" });
        return;
      }
      this.user = getUser() || {};
      if (this.userRole === "admin") {
        this.loadAdminData();
      } else {
        this.loadPatrolData();
      }
    },
    methods: {
      goPatrol() {
        uni.navigateTo({ url: "/pages/patrol/patrol" });
      },
      onFeatureClick(item) {
        if (item.url) {
          uni.navigateTo({ url: item.url });
          return;
        }
        uni.showToast({ title: this.t("home.featureBuilding"), icon: "none" });
      },
      loadPatrolData() {
        uni.getLocation({
          type: "wgs84",
          success: (res) => {
            this.location.latitude = res.latitude;
            this.location.longitude = res.longitude;
            this.loadNearestSite();
          },
          fail: () => {
            this.nearestSite = {
              name: this.t("home.locationFailedName"),
              address: this.t("home.locationFailedAddress"),
              distance: "-"
            };
          }
        });
      },
      loadNearestSite() {
        uni.request({
          url: `${config.API_BASE_URL}/api/heritages/nearby`,
          method: "GET",
          header: getAuthHeader(),
          data: {
            latitude: this.location.latitude,
            longitude: this.location.longitude
          },
          success: (res) => {
            if (res.statusCode === 200 && res.data) {
              this.nearestSite = res.data;
              return;
            }
            this.nearestSite = { name: this.t("home.noMatchedSite"), address: "", distance: "-" };
          },
          fail: () => {
            this.nearestSite = {
              name: this.t("home.loadFailedName"),
              address: this.t("home.checkNetwork"),
              distance: "-"
            };
          }
        });
      },
      async loadAdminData() {
        uni.showLoading({ title: this.t("common.loading") });
        try {
          const [statsRes, recordsRes, projectsRes] = await Promise.all([
            this.request(`${config.API_BASE_URL}/api/dashboard/realtime-stats`),
            this.request(`${config.API_BASE_URL}/api/inspections/mine`),
            this.request(`${config.API_BASE_URL}/api/admin/projects`)
          ]);
          const stats = statsRes && statsRes.data || {};
          this.adminStats.totalSites = stats.overview && stats.overview.total_sites || 0;
          const records = recordsRes && recordsRes.data && recordsRes.data.items || [];
          const todayKey = this.todayString();
          this.adminStats.todayInspections = records.filter((item) => {
            const t2 = item.inspect_time || "";
            return t2.slice(0, 10) === todayKey;
          }).length;
          const projects = projectsRes && projectsRes.data && projectsRes.data.items || [];
          this.adminStats.pendingProjects = projects.filter((item) => item.workflow_status !== "archived").length;
        } catch (error) {
          uni.showToast({ title: this.t("home.loadDataFailed"), icon: "none" });
        } finally {
          uni.hideLoading();
        }
      },
      request(url, method = "GET", data = null) {
        return new Promise((resolve, reject) => {
          uni.request({
            url,
            method,
            data,
            header: {
              ...getAuthHeader(),
              "Content-Type": "application/json"
            },
            success: resolve,
            fail: reject
          });
        });
      },
      todayString() {
        const d = /* @__PURE__ */ new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      }
    }
  };
  function _sfc_render$9(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_BottomNav = vue.resolveComponent("BottomNav");
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createElementVNode("view", { class: "header-card" }, [
        vue.createElementVNode(
          "text",
          { class: "header-title" },
          vue.toDisplayString($options.userRole === "admin" ? _ctx.t("home.adminDashboard") : _ctx.t("home.patrolDashboard")),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "header-subtitle" },
          vue.toDisplayString($data.user.full_name || $data.user.username || _ctx.t("home.guestUser")),
          1
          /* TEXT */
        )
      ]),
      $options.userRole === "patrol" ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "patrol-panel"
      }, [
        vue.createElementVNode(
          "button",
          {
            class: "start-btn",
            onClick: _cache[0] || (_cache[0] = (...args) => $options.goPatrol && $options.goPatrol(...args))
          },
          vue.toDisplayString(_ctx.t("home.startPatrol")),
          1
          /* TEXT */
        ),
        vue.createElementVNode("view", { class: "card nearest-card" }, [
          vue.createElementVNode(
            "text",
            { class: "card-title" },
            vue.toDisplayString(_ctx.t("home.nearestSite")),
            1
            /* TEXT */
          ),
          $data.nearestSite ? (vue.openBlock(), vue.createElementBlock("view", { key: 0 }, [
            vue.createElementVNode(
              "text",
              { class: "item-title" },
              vue.toDisplayString($data.nearestSite.name),
              1
              /* TEXT */
            ),
            vue.createElementVNode(
              "text",
              { class: "item-text" },
              vue.toDisplayString($data.nearestSite.address || _ctx.t("home.noAddress")),
              1
              /* TEXT */
            ),
            typeof $data.nearestSite.distance === "number" ? (vue.openBlock(), vue.createElementBlock(
              "text",
              {
                key: 0,
                class: "item-text"
              },
              vue.toDisplayString(_ctx.t("home.distanceKm", { distance: $data.nearestSite.distance })),
              1
              /* TEXT */
            )) : (vue.openBlock(), vue.createElementBlock(
              "text",
              {
                key: 1,
                class: "item-text"
              },
              vue.toDisplayString($data.nearestSite.distance || _ctx.t("home.nearestAutoPicked")),
              1
              /* TEXT */
            ))
          ])) : (vue.openBlock(), vue.createElementBlock("view", { key: 1 }, [
            vue.createElementVNode(
              "text",
              { class: "item-text" },
              vue.toDisplayString(_ctx.t("home.locating")),
              1
              /* TEXT */
            )
          ]))
        ])
      ])) : (vue.openBlock(), vue.createElementBlock("view", {
        key: 1,
        class: "admin-panel"
      }, [
        vue.createElementVNode("view", { class: "stats-row" }, [
          vue.createElementVNode("view", { class: "stat-card card" }, [
            vue.createElementVNode(
              "text",
              { class: "stat-label" },
              vue.toDisplayString(_ctx.t("home.totalSites")),
              1
              /* TEXT */
            ),
            vue.createElementVNode(
              "text",
              { class: "stat-value" },
              vue.toDisplayString($data.adminStats.totalSites),
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("view", { class: "stat-card card" }, [
            vue.createElementVNode(
              "text",
              { class: "stat-label" },
              vue.toDisplayString(_ctx.t("home.todayInspections")),
              1
              /* TEXT */
            ),
            vue.createElementVNode(
              "text",
              { class: "stat-value" },
              vue.toDisplayString($data.adminStats.todayInspections),
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("view", { class: "stat-card card" }, [
            vue.createElementVNode(
              "text",
              { class: "stat-label" },
              vue.toDisplayString(_ctx.t("home.pendingProjects")),
              1
              /* TEXT */
            ),
            vue.createElementVNode(
              "text",
              { class: "stat-value" },
              vue.toDisplayString($data.adminStats.pendingProjects),
              1
              /* TEXT */
            )
          ])
        ]),
        vue.createElementVNode("view", { class: "card" }, [
          vue.createElementVNode(
            "text",
            { class: "card-title" },
            vue.toDisplayString(_ctx.t("home.features")),
            1
            /* TEXT */
          ),
          vue.createElementVNode("view", { class: "feature-grid" }, [
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($options.adminFeatures, (item) => {
                return vue.openBlock(), vue.createElementBlock("view", {
                  class: "feature-item",
                  key: item.key,
                  onClick: ($event) => $options.onFeatureClick(item)
                }, [
                  vue.createElementVNode(
                    "text",
                    { class: "feature-icon" },
                    vue.toDisplayString(item.icon),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { class: "feature-text" },
                    vue.toDisplayString(item.name),
                    1
                    /* TEXT */
                  )
                ], 8, ["onClick"]);
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ])
        ])
      ])),
      vue.createVNode(_component_BottomNav, {
        current: "home",
        userInfo: $data.user
      }, null, 8, ["userInfo"])
    ]);
  }
  const PagesHomeHome = /* @__PURE__ */ _export_sfc(_sfc_main$a, [["render", _sfc_render$9], ["__file", "C:/Users/14434/uniapp/pages/home/home.vue"]]);
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  function addWatermark(tempFilePath, text, context) {
    return new Promise((resolve, reject) => {
      const ctx = uni.createCanvasContext("watermarkCanvas", context);
      const maxCanvasSide = 1920;
      uni.getImageInfo({
        src: tempFilePath,
        success: (image) => {
          const originalWidth = image.width;
          const originalHeight = image.height;
          const scale = Math.min(1, maxCanvasSide / Math.max(originalWidth, originalHeight));
          const width = Math.max(1, Math.round(originalWidth * scale));
          const height = Math.max(1, Math.round(originalHeight * scale));
          if (context && context.watermarkCanvas) {
            context.watermarkCanvas.width = width;
            context.watermarkCanvas.height = height;
          }
          const drawWatermark = () => {
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(image.path || tempFilePath, 0, 0, width, height);
            const fontSize = Math.max(16, Math.floor(Math.min(width, height) * 0.03));
            const lineHeight = Math.floor(fontSize * 1.35);
            const padding = Math.floor(fontSize * 0.9);
            const textLines = text.split("\n");
            const blockHeight = lineHeight * textLines.length + padding;
            ctx.setFillStyle("rgba(0, 0, 0, 0.45)");
            ctx.fillRect(0, height - blockHeight - padding, width, blockHeight + padding);
            ctx.setFontSize(fontSize);
            ctx.setFillStyle("rgba(255, 255, 255, 0.96)");
            ctx.setTextAlign("right");
            ctx.setTextBaseline("bottom");
            textLines.forEach((line, index) => {
              const y = height - padding - (textLines.length - 1 - index) * lineHeight;
              ctx.fillText(line, width - padding, y);
            });
            ctx.draw(false, () => {
              uni.canvasToTempFilePath({
                canvasId: "watermarkCanvas",
                x: 0,
                y: 0,
                width,
                height,
                destWidth: width,
                destHeight: height,
                fileType: "jpg",
                quality: 0.92,
                success: (res) => {
                  resolve(res.tempFilePath);
                },
                fail: (err) => {
                  formatAppLog("error", "at common/js/watermark.js:69", "canvasToTempFilePath failed:", JSON.stringify(err));
                  reject(err);
                }
              }, context);
            });
          };
          if (context && typeof context.$nextTick === "function") {
            context.$nextTick(() => setTimeout(drawWatermark, 30));
            return;
          }
          setTimeout(drawWatermark, 30);
        },
        fail: (err) => {
          formatAppLog("error", "at common/js/watermark.js:84", "getImageInfo failed:", JSON.stringify(err));
          reject(err);
        }
      });
    });
  }
  const _sfc_main$9 = {
    mixins: [createPageI18n("patrol")],
    components: {
      BottomNav
    },
    data() {
      return {
        currentUser: {},
        inspectionStatus: "normal",
        issueDetails: "",
        locationAvailable: false,
        location: {
          latitude: 0,
          longitude: 0,
          address: t("patrol.locating")
        },
        nearestSite: null,
        manualSearchKeyword: "",
        manualSites: [],
        manualSelectedIndex: -1,
        manualLoading: false,
        previewImage: null,
        patrolRecord: {
          site_id: null,
          photo_path: null,
          latitude: null,
          longitude: null
        },
        watermarkCanvas: {
          width: 1,
          height: 1
        }
      };
    },
    onLoad() {
      if (!getToken()) {
        uni.reLaunch({ url: "/pages/index/index" });
        return;
      }
      this.currentUser = getUser() || {};
      this.getCurrentLocation();
      this.loadManualSites();
    },
    methods: {
      getRoleText() {
        const role = this.currentUser.role || (this.currentUser.is_admin ? "管理员" : "看护员");
        return getRoleLabel(role);
      },
      getWatermarkUserName() {
        return this.currentUser.full_name || this.currentUser.username || this.t("patrol.notLoggedInUser");
      },
      getSelectedSiteName() {
        if (this.nearestSite && this.nearestSite.name) {
          return this.nearestSite.name;
        }
        if (this.manualSelectedIndex >= 0 && this.manualSites[this.manualSelectedIndex]) {
          return this.manualSites[this.manualSelectedIndex].name;
        }
        const matchedSite = this.manualSites.find((item) => item.id === this.patrolRecord.site_id);
        if (matchedSite && matchedSite.name) {
          return matchedSite.name;
        }
        return this.t("patrol.unselectedSiteName");
      },
      buildWatermarkText(time) {
        const userName = this.getWatermarkUserName();
        const siteName = this.getSelectedSiteName();
        const longitude = Number(this.location.longitude || 0).toFixed(6);
        const latitude = Number(this.location.latitude || 0).toFixed(6);
        return `${this.t("patrol.watermarkUser")}: ${userName}
${this.t("patrol.watermarkSite")}: ${siteName}
${this.t("patrol.watermarkTime")}: ${time}
${this.t("patrol.watermarkCoord")}: ${longitude}, ${latitude}`;
      },
      setInspectionStatus(status) {
        this.inspectionStatus = status;
      },
      // 1. 获取当前地理位置
      getCurrentLocation() {
        uni.getLocation({
          type: "wgs84",
          geocode: true,
          // 返回地址信息
          success: (res) => {
            this.locationAvailable = true;
            this.location.latitude = res.latitude;
            this.location.longitude = res.longitude;
            this.location.address = res.address ? `${res.address.city}${res.address.district}${res.address.street}${res.address.streetNum}` : this.t("patrol.unknownLocation");
            this.findNearestSite();
          },
          fail: (err) => {
            this.locationAvailable = false;
            this.location.address = this.t("patrol.locationFailedManual");
            uni.showToast({
              title: this.t("patrol.locationFailedToast"),
              icon: "none"
            });
            this.loadManualSites();
            formatAppLog("error", "at pages/patrol/patrol.vue:194", "获取位置失败:", err);
          }
        });
      },
      // 2. 请求后端查找最近的文物点
      findNearestSite() {
        uni.request({
          url: `${config.API_BASE_URL}/api/heritages/nearby`,
          method: "GET",
          header: getAuthHeader(),
          data: {
            latitude: this.location.latitude,
            longitude: this.location.longitude
          },
          success: (res) => {
            if (res.statusCode === 200 && res.data) {
              this.nearestSite = res.data;
              this.patrolRecord.site_id = res.data.id;
            } else {
              this.nearestSite = { name: this.t("patrol.nearbyNotFound"), distance: "-" };
            }
          },
          fail: (err) => {
            this.nearestSite = { name: this.t("patrol.nearbyFailed"), distance: "-" };
            this.loadManualSites();
            formatAppLog("error", "at pages/patrol/patrol.vue:219", "查找最近文物点失败:", err);
          }
        });
      },
      loadManualSites(keyword = "") {
        this.manualLoading = true;
        uni.request({
          url: `${config.API_BASE_URL}/api/heritages/search`,
          method: "GET",
          header: getAuthHeader(),
          data: {
            q: keyword,
            limit: 20
          },
          success: (res) => {
            if (res.statusCode === 200 && res.data) {
              this.manualSites = res.data.items || [];
              const selectedId = this.patrolRecord.site_id;
              this.manualSelectedIndex = this.manualSites.findIndex((item) => item.id === selectedId);
              return;
            }
            this.manualSites = [];
            this.manualSelectedIndex = -1;
          },
          fail: () => {
            this.manualSites = [];
            this.manualSelectedIndex = -1;
          },
          complete: () => {
            this.manualLoading = false;
          }
        });
      },
      searchManualSites() {
        this.loadManualSites(this.manualSearchKeyword || "");
      },
      onManualSiteChange(event) {
        const index = Number(event.detail.value);
        const site = this.manualSites[index];
        if (!site) {
          return;
        }
        this.manualSelectedIndex = index;
        this.selectManualSite(site);
      },
      getManualPickerText() {
        if (!this.manualSites.length) {
          return this.manualLoading ? this.t("patrol.loadingSites") : this.t("patrol.noSelectableSites");
        }
        if (this.manualSelectedIndex < 0 || !this.manualSites[this.manualSelectedIndex]) {
          return this.t("patrol.selectPatrolSite");
        }
        const site = this.manualSites[this.manualSelectedIndex];
        return this.t("patrol.selectedSiteFormat", {
          name: site.name,
          code: site.sip_code || this.t("patrol.noCode")
        });
      },
      selectManualSite(site) {
        this.nearestSite = {
          id: site.id,
          name: site.name,
          address: site.address,
          distance: this.t("patrol.manualSelected")
        };
        this.patrolRecord.site_id = site.id;
        if (!this.locationAvailable) {
          this.location.latitude = Number(site.latitude) || 0;
          this.location.longitude = Number(site.longitude) || 0;
          this.location.address = site.address || this.t("patrol.manualSelectedAddress", { name: site.name });
        }
        uni.showToast({ title: this.t("patrol.selectedToast", { name: site.name }), icon: "none" });
      },
      // 3. 拍照
      takePhoto() {
        if (!this.patrolRecord.site_id) {
          uni.showToast({
            title: this.t("patrol.selectSiteFirst"),
            icon: "none"
          });
          return;
        }
        uni.chooseImage({
          count: 1,
          sizeType: ["compressed"],
          sourceType: ["camera"],
          success: (res) => {
            const tempFilePath = res.tempFilePaths[0];
            const now = /* @__PURE__ */ new Date();
            const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
            const watermarkText = this.buildWatermarkText(time);
            addWatermark(tempFilePath, watermarkText, this).then((watermarkedPath) => {
              this.previewImage = watermarkedPath;
              this.patrolRecord.photo_path = watermarkedPath;
              this.patrolRecord.latitude = this.location.latitude;
              this.patrolRecord.longitude = this.location.longitude;
            }).catch((err) => {
              uni.showToast({ title: this.t("patrol.watermarkFailed"), icon: "none" });
              this.previewImage = tempFilePath;
              this.patrolRecord.photo_path = tempFilePath;
              this.patrolRecord.latitude = this.location.latitude;
              this.patrolRecord.longitude = this.location.longitude;
              formatAppLog("error", "at pages/patrol/patrol.vue:326", "水印添加失败:", err);
            });
          },
          fail: (err) => {
            if (err && /cancel/i.test(String(err.errMsg || ""))) {
              return;
            }
            uni.showToast({ title: this.t("patrol.watermarkFailed"), icon: "none" });
            formatAppLog("error", "at pages/patrol/patrol.vue:334", "拍照失败:", err);
          }
        });
      },
      // 5. 上传巡查记录
      uploadRecord() {
        if (!this.patrolRecord.photo_path) {
          uni.showToast({ title: this.t("patrol.shootPhotoFirst"), icon: "none" });
          return;
        }
        const issueDetails = (this.issueDetails || "").trim();
        if (this.inspectionStatus === "problem" && !issueDetails) {
          uni.showToast({ title: this.t("patrol.fillIssueDetails"), icon: "none" });
          return;
        }
        if (this.patrolRecord.latitude == null || this.patrolRecord.longitude == null) {
          this.patrolRecord.latitude = this.location.latitude;
          this.patrolRecord.longitude = this.location.longitude;
        }
        uni.uploadFile({
          url: `${config.API_BASE_URL}/api/inspections/upload`,
          filePath: this.patrolRecord.photo_path,
          name: "photo",
          header: getAuthHeader(),
          formData: {
            "site_id": this.patrolRecord.site_id,
            "latitude": this.patrolRecord.latitude,
            "longitude": this.patrolRecord.longitude,
            "is_normal": this.inspectionStatus !== "problem",
            "issue_details": issueDetails
          },
          success: (uploadRes) => {
            let data = {};
            try {
              data = JSON.parse(uploadRes.data || "{}");
            } catch (e) {
              data = {};
            }
            if (uploadRes.statusCode === 201) {
              uni.showToast({
                title: this.t("patrol.uploadSuccess"),
                icon: "success"
              });
              this.previewImage = null;
              this.patrolRecord.photo_path = null;
              this.inspectionStatus = "normal";
              this.issueDetails = "";
            } else {
              uni.showToast({
                title: data.detail || this.t("patrol.uploadFailed"),
                icon: "none"
              });
            }
          },
          fail: (err) => {
            uni.showToast({
              title: this.t("patrol.uploadFailedNetwork"),
              icon: "none"
            });
            formatAppLog("error", "at pages/patrol/patrol.vue:396", "上传失败:", err);
          }
        });
      }
    }
  };
  function _sfc_render$8(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_BottomNav = vue.resolveComponent("BottomNav");
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "hero-card" }, [
        vue.createElementVNode("view", { class: "hero-top" }, [
          vue.createElementVNode("view", null, [
            vue.createElementVNode(
              "text",
              { class: "hero-label" },
              vue.toDisplayString(_ctx.t("patrol.heroLabel")),
              1
              /* TEXT */
            ),
            vue.createElementVNode(
              "text",
              { class: "hero-title" },
              vue.toDisplayString($data.currentUser.full_name || $data.currentUser.username || _ctx.t("patrol.notLoggedInUser")),
              1
              /* TEXT */
            ),
            vue.createElementVNode(
              "text",
              { class: "hero-role" },
              vue.toDisplayString(_ctx.t("patrol.currentRole", { role: $options.getRoleText() })),
              1
              /* TEXT */
            )
          ])
        ]),
        vue.createElementVNode(
          "text",
          { class: "hero-desc" },
          vue.toDisplayString(_ctx.t("patrol.heroDesc")),
          1
          /* TEXT */
        )
      ]),
      vue.createElementVNode("view", { class: "location-section" }, [
        vue.createElementVNode(
          "text",
          { class: "section-kicker" },
          vue.toDisplayString(_ctx.t("patrol.locationInfo")),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "location-address" },
          vue.toDisplayString($data.location.address || _ctx.t("patrol.locating")),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "location-coord" },
          vue.toDisplayString(_ctx.t("patrol.longitude")) + " " + vue.toDisplayString($data.location.longitude.toFixed(4)) + " · " + vue.toDisplayString(_ctx.t("patrol.latitude")) + " " + vue.toDisplayString($data.location.latitude.toFixed(4)),
          1
          /* TEXT */
        )
      ]),
      vue.createElementVNode("view", { class: "heritage-section" }, [
        vue.createElementVNode(
          "text",
          { class: "title" },
          vue.toDisplayString(_ctx.t("patrol.nearestSite")),
          1
          /* TEXT */
        ),
        $data.nearestSite ? (vue.openBlock(), vue.createElementBlock("view", { key: 0 }, [
          vue.createElementVNode(
            "text",
            { class: "site-name" },
            vue.toDisplayString($data.nearestSite.name),
            1
            /* TEXT */
          ),
          typeof $data.nearestSite.distance === "number" ? (vue.openBlock(), vue.createElementBlock(
            "text",
            {
              key: 0,
              class: "site-meta"
            },
            vue.toDisplayString(_ctx.t("home.distanceKm", { distance: $data.nearestSite.distance })),
            1
            /* TEXT */
          )) : (vue.openBlock(), vue.createElementBlock(
            "text",
            {
              key: 1,
              class: "site-meta"
            },
            vue.toDisplayString($data.nearestSite.distance || _ctx.t("patrol.selectedSite")),
            1
            /* TEXT */
          )),
          vue.createElementVNode(
            "text",
            { class: "site-meta" },
            vue.toDisplayString($data.nearestSite.address || _ctx.t("patrol.noAddressInfo")),
            1
            /* TEXT */
          )
        ])) : (vue.openBlock(), vue.createElementBlock("view", { key: 1 }, [
          vue.createElementVNode(
            "text",
            { class: "site-meta" },
            vue.toDisplayString(_ctx.t("patrol.searching")),
            1
            /* TEXT */
          )
        ]))
      ]),
      vue.createElementVNode("view", { class: "manual-section" }, [
        vue.createElementVNode(
          "text",
          { class: "title" },
          vue.toDisplayString(_ctx.t("patrol.manualTitle")),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "manual-copy" },
          vue.toDisplayString(_ctx.t("patrol.manualCopy")),
          1
          /* TEXT */
        ),
        vue.createElementVNode("view", { class: "manual-search-row" }, [
          vue.withDirectives(vue.createElementVNode("input", {
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.manualSearchKeyword = $event),
            class: "manual-input",
            placeholder: _ctx.t("patrol.manualSearchPlaceholder")
          }, null, 8, ["placeholder"]), [
            [vue.vModelText, $data.manualSearchKeyword]
          ]),
          vue.createElementVNode(
            "button",
            {
              class: "manual-search-btn",
              onClick: _cache[1] || (_cache[1] = (...args) => $options.searchManualSites && $options.searchManualSites(...args))
            },
            vue.toDisplayString(_ctx.t("common.search")),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("picker", {
          class: "manual-picker",
          range: $data.manualSites,
          "range-key": "name",
          onChange: _cache[2] || (_cache[2] = (...args) => $options.onManualSiteChange && $options.onManualSiteChange(...args)),
          disabled: !$data.manualSites.length
        }, [
          vue.createElementVNode(
            "view",
            { class: "manual-picker-text" },
            vue.toDisplayString($options.getManualPickerText()),
            1
            /* TEXT */
          )
        ], 40, ["range", "disabled"]),
        !$data.manualLoading && !$data.manualSites.length ? (vue.openBlock(), vue.createElementBlock(
          "text",
          {
            key: 0,
            class: "manual-empty"
          },
          vue.toDisplayString(_ctx.t("patrol.manualNoResult")),
          1
          /* TEXT */
        )) : vue.createCommentVNode("v-if", true)
      ]),
      vue.createElementVNode("view", { class: "action-section" }, [
        vue.createElementVNode(
          "text",
          { class: "title" },
          vue.toDisplayString(_ctx.t("patrol.actionTitle")),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "action-copy" },
          vue.toDisplayString(_ctx.t("patrol.actionCopy")),
          1
          /* TEXT */
        ),
        vue.createElementVNode("view", { class: "status-row" }, [
          vue.createElementVNode(
            "text",
            { class: "status-label" },
            vue.toDisplayString(_ctx.t("patrol.siteStatus")),
            1
            /* TEXT */
          ),
          vue.createElementVNode("view", { class: "status-options" }, [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-option", $data.inspectionStatus === "normal" ? "active" : ""]),
                onClick: _cache[3] || (_cache[3] = ($event) => $options.setInspectionStatus("normal"))
              },
              vue.toDisplayString(_ctx.t("patrol.normal")),
              3
              /* TEXT, CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-option", "problem", $data.inspectionStatus === "problem" ? "active" : ""]),
                onClick: _cache[4] || (_cache[4] = ($event) => $options.setInspectionStatus("problem"))
              },
              vue.toDisplayString(_ctx.t("patrol.problem")),
              3
              /* TEXT, CLASS */
            )
          ])
        ]),
        vue.withDirectives(vue.createElementVNode("textarea", {
          "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $data.issueDetails = $event),
          class: "issue-textarea",
          placeholder: $data.inspectionStatus === "problem" ? _ctx.t("patrol.problemRequiredPlaceholder") : _ctx.t("patrol.problemOptionalPlaceholder")
        }, null, 8, ["placeholder"]), [
          [vue.vModelText, $data.issueDetails]
        ]),
        $data.inspectionStatus === "problem" ? (vue.openBlock(), vue.createElementBlock(
          "text",
          {
            key: 0,
            class: "issue-hint"
          },
          vue.toDisplayString(_ctx.t("patrol.problemHint")),
          1
          /* TEXT */
        )) : vue.createCommentVNode("v-if", true),
        vue.createElementVNode(
          "button",
          {
            class: "action-btn",
            onClick: _cache[6] || (_cache[6] = (...args) => $options.takePhoto && $options.takePhoto(...args))
          },
          vue.toDisplayString(_ctx.t("patrol.takePhoto")),
          1
          /* TEXT */
        )
      ]),
      $data.previewImage ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "preview-section"
      }, [
        vue.createElementVNode(
          "text",
          { class: "title" },
          vue.toDisplayString(_ctx.t("patrol.previewTitle")),
          1
          /* TEXT */
        ),
        vue.createElementVNode("image", {
          src: $data.previewImage,
          mode: "aspectFit"
        }, null, 8, ["src"]),
        vue.createElementVNode(
          "button",
          {
            class: "upload-btn",
            onClick: _cache[7] || (_cache[7] = (...args) => $options.uploadRecord && $options.uploadRecord(...args))
          },
          vue.toDisplayString(_ctx.t("patrol.confirmUpload")),
          1
          /* TEXT */
        )
      ])) : vue.createCommentVNode("v-if", true),
      vue.createVNode(_component_BottomNav, {
        current: "patrol",
        userInfo: $data.currentUser
      }, null, 8, ["userInfo"]),
      vue.createElementVNode("canvas", {
        "canvas-id": "watermarkCanvas",
        width: $data.watermarkCanvas.width,
        height: $data.watermarkCanvas.height,
        style: vue.normalizeStyle(`position:absolute;left:-9999px;top:-9999px;width:${$data.watermarkCanvas.width}px;height:${$data.watermarkCanvas.height}px;`)
      }, null, 12, ["width", "height"])
    ]);
  }
  const PagesPatrolPatrol = /* @__PURE__ */ _export_sfc(_sfc_main$9, [["render", _sfc_render$8], ["__file", "C:/Users/14434/uniapp/pages/patrol/patrol.vue"]]);
  const _sfc_main$8 = {
    mixins: [createPageI18n("records")],
    components: {
      BottomNav
    },
    data() {
      return {
        loading: false,
        records: []
      };
    },
    onLoad() {
      if (!getToken()) {
        uni.reLaunch({ url: "/pages/index/index" });
        return;
      }
      this.loadRecords();
    },
    methods: {
      loadRecords() {
        this.loading = true;
        uni.request({
          url: `${config.API_BASE_URL}/api/inspections/mine`,
          method: "GET",
          header: getAuthHeader(),
          success: (res) => {
            if (res.statusCode === 200 && res.data) {
              this.records = res.data.items || [];
              return;
            }
            uni.showToast({ title: this.t("records.loadFailed"), icon: "none" });
          },
          fail: () => {
            uni.showToast({ title: this.t("records.loadFailed"), icon: "none" });
          },
          complete: () => {
            this.loading = false;
          }
        });
      },
      previewImage(url) {
        uni.previewImage({ urls: [url] });
      },
      formatCoord(value) {
        if (value === null || value === void 0 || value === "") {
          return "-";
        }
        return Number(value).toFixed(5);
      }
    }
  };
  function _sfc_render$7(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_BottomNav = vue.resolveComponent("BottomNav");
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createElementVNode("view", { class: "hero" }, [
        vue.createElementVNode("view", null, [
          vue.createElementVNode(
            "text",
            { class: "hero-kicker" },
            vue.toDisplayString(_ctx.t("records.heroLabel")),
            1
            /* TEXT */
          ),
          vue.createElementVNode(
            "text",
            { class: "hero-title" },
            vue.toDisplayString(_ctx.t("records.title")),
            1
            /* TEXT */
          ),
          vue.createElementVNode(
            "text",
            { class: "hero-subtitle" },
            vue.toDisplayString(_ctx.t("records.subtitle")),
            1
            /* TEXT */
          )
        ])
      ]),
      vue.createElementVNode("view", { class: "summary-card" }, [
        vue.createElementVNode(
          "text",
          { class: "summary-label" },
          vue.toDisplayString(_ctx.t("records.submittedRecords")),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "summary-value" },
          vue.toDisplayString($data.records.length),
          1
          /* TEXT */
        )
      ]),
      vue.createElementVNode("scroll-view", {
        "scroll-y": "",
        class: "content-scroll"
      }, [
        $data.records.length === 0 && !$data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "empty-card"
        }, [
          vue.createElementVNode(
            "text",
            { class: "empty-title" },
            vue.toDisplayString(_ctx.t("records.emptyTitle")),
            1
            /* TEXT */
          ),
          vue.createElementVNode(
            "text",
            { class: "empty-copy" },
            vue.toDisplayString(_ctx.t("records.emptyCopy")),
            1
            /* TEXT */
          )
        ])) : vue.createCommentVNode("v-if", true),
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($data.records, (item) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              key: item.id,
              class: "record-card"
            }, [
              vue.createElementVNode("view", { class: "record-header" }, [
                vue.createElementVNode("view", null, [
                  vue.createElementVNode(
                    "text",
                    { class: "record-site" },
                    vue.toDisplayString(item.site_name),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { class: "record-time" },
                    vue.toDisplayString(item.inspect_time),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode(
                  "text",
                  {
                    class: vue.normalizeClass(["status-chip", item.is_normal ? "status-normal" : "status-alert"])
                  },
                  vue.toDisplayString(item.is_normal ? _ctx.t("records.normal") : _ctx.t("records.abnormal")),
                  3
                  /* TEXT, CLASS */
                )
              ]),
              vue.createElementVNode(
                "text",
                { class: "record-text" },
                vue.toDisplayString(_ctx.t("records.issueLabel", { detail: item.issue_details || _ctx.t("common.none") })),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "record-text" },
                vue.toDisplayString(_ctx.t("records.coordLabel", { longitude: $options.formatCoord(item.longitude), latitude: $options.formatCoord(item.latitude) })),
                1
                /* TEXT */
              ),
              item.photo_url ? (vue.openBlock(), vue.createElementBlock("image", {
                key: 0,
                class: "record-image",
                src: item.photo_url,
                mode: "aspectFill",
                onClick: ($event) => $options.previewImage(item.photo_url)
              }, null, 8, ["src", "onClick"])) : vue.createCommentVNode("v-if", true)
            ]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ]),
      vue.createVNode(_component_BottomNav, { current: "records" })
    ]);
  }
  const PagesRecordsRecords = /* @__PURE__ */ _export_sfc(_sfc_main$8, [["render", _sfc_render$7], ["__file", "C:/Users/14434/uniapp/pages/records/records.vue"]]);
  const _sfc_main$7 = {
    mixins: [createPageI18n("my")],
    components: {
      BottomNav
    },
    data() {
      return {
        user: {},
        saving: false,
        passwordForm: {
          current_password: "",
          new_password: "",
          confirm_password: ""
        }
      };
    },
    onLoad() {
      if (!getToken()) {
        uni.reLaunch({ url: "/pages/index/index" });
        return;
      }
      this.user = getUser() || {};
      this.loadMe();
    },
    onShow() {
      if (getToken()) {
        this.loadMe(false);
      }
    },
    methods: {
      getRoleDisplay() {
        if (!this.user || !this.user.role && !this.user.is_admin) {
          return "-";
        }
        const rawRole = this.user.role || (this.user.is_admin ? "管理员" : "看护员");
        return getRoleLabel(rawRole);
      },
      loadMe(showLoading = true) {
        if (showLoading) {
          uni.showLoading({ title: this.t("my.loadMe") });
        }
        uni.request({
          url: `${config.API_BASE_URL}/api/auth/me`,
          method: "GET",
          header: getAuthHeader(),
          success: (res) => {
            if (res.statusCode === 200 && res.data && res.data.user) {
              this.user = res.data.user;
              setSession(getToken(), this.user);
              return;
            }
            if (res.statusCode === 401) {
              this.logout(false);
            }
          },
          complete: () => {
            if (showLoading) {
              uni.hideLoading();
            }
          }
        });
      },
      changePassword() {
        const form = this.passwordForm;
        if (!form.current_password || !form.new_password || !form.confirm_password) {
          uni.showToast({ title: this.t("my.fillPasswordInfo"), icon: "none" });
          return;
        }
        if (form.new_password.length < 6) {
          uni.showToast({ title: this.t("my.newPasswordMin"), icon: "none" });
          return;
        }
        if (form.new_password !== form.confirm_password) {
          uni.showToast({ title: this.t("my.passwordMismatch"), icon: "none" });
          return;
        }
        this.saving = true;
        uni.request({
          url: `${config.API_BASE_URL}/api/auth/change-password`,
          method: "POST",
          header: {
            "Content-Type": "application/json",
            ...getAuthHeader()
          },
          data: {
            current_password: form.current_password,
            new_password: form.new_password
          },
          success: (res) => {
            if (res.statusCode === 200) {
              this.passwordForm.current_password = "";
              this.passwordForm.new_password = "";
              this.passwordForm.confirm_password = "";
              uni.showToast({ title: this.t("my.passwordSuccess"), icon: "success" });
              return;
            }
            uni.showToast({ title: res.data && res.data.detail || this.t("my.passwordFailed"), icon: "none" });
          },
          fail: () => {
            uni.showToast({ title: this.t("my.passwordFailed"), icon: "none" });
          },
          complete: () => {
            this.saving = false;
          }
        });
      },
      logout(showToast = true) {
        clearSession();
        if (showToast) {
          uni.showToast({ title: this.t("my.loggedOut"), icon: "none" });
        }
        setTimeout(() => {
          uni.reLaunch({ url: "/pages/index/index" });
        }, 200);
      },
      goAbout() {
        uni.navigateTo({
          url: "/pages/about/about",
          fail: (error) => {
            formatAppLog("error", "at pages/my/my.vue:168", "打开关于页面失败:", error);
            uni.showToast({ title: this.t("my.openAboutFailed"), icon: "none" });
          }
        });
      }
    }
  };
  function _sfc_render$6(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_BottomNav = vue.resolveComponent("BottomNav");
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createElementVNode("view", { class: "hero" }, [
        vue.createElementVNode("view", null, [
          vue.createElementVNode(
            "text",
            { class: "hero-kicker" },
            vue.toDisplayString(_ctx.t("my.heroLabel")),
            1
            /* TEXT */
          ),
          vue.createElementVNode(
            "text",
            { class: "hero-title" },
            vue.toDisplayString(_ctx.t("my.title")),
            1
            /* TEXT */
          ),
          vue.createElementVNode(
            "text",
            { class: "hero-subtitle" },
            vue.toDisplayString(_ctx.t("my.subtitle")),
            1
            /* TEXT */
          )
        ])
      ]),
      vue.createElementVNode("view", { class: "card profile-card" }, [
        vue.createElementVNode(
          "text",
          { class: "label" },
          vue.toDisplayString(_ctx.t("my.fullName")),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "value" },
          vue.toDisplayString($data.user.full_name || "-"),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "label" },
          vue.toDisplayString(_ctx.t("my.username")),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "value" },
          vue.toDisplayString($data.user.username || "-"),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "label" },
          vue.toDisplayString(_ctx.t("my.role")),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "value" },
          vue.toDisplayString($options.getRoleDisplay()),
          1
          /* TEXT */
        )
      ]),
      vue.createElementVNode("view", { class: "card password-card" }, [
        vue.createElementVNode(
          "text",
          { class: "section-title" },
          vue.toDisplayString(_ctx.t("my.changePassword")),
          1
          /* TEXT */
        ),
        vue.withDirectives(vue.createElementVNode("input", {
          class: "input",
          password: "",
          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.passwordForm.current_password = $event),
          placeholder: _ctx.t("my.currentPassword")
        }, null, 8, ["placeholder"]), [
          [vue.vModelText, $data.passwordForm.current_password]
        ]),
        vue.withDirectives(vue.createElementVNode("input", {
          class: "input",
          password: "",
          "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.passwordForm.new_password = $event),
          placeholder: _ctx.t("my.newPassword")
        }, null, 8, ["placeholder"]), [
          [vue.vModelText, $data.passwordForm.new_password]
        ]),
        vue.withDirectives(vue.createElementVNode("input", {
          class: "input",
          password: "",
          "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.passwordForm.confirm_password = $event),
          placeholder: _ctx.t("my.confirmPassword")
        }, null, 8, ["placeholder"]), [
          [vue.vModelText, $data.passwordForm.confirm_password]
        ]),
        vue.createElementVNode("button", {
          class: "action-btn primary",
          onClick: _cache[3] || (_cache[3] = (...args) => $options.changePassword && $options.changePassword(...args)),
          disabled: $data.saving
        }, vue.toDisplayString($data.saving ? _ctx.t("my.saving") : _ctx.t("my.saveNewPassword")), 9, ["disabled"])
      ]),
      vue.createElementVNode("view", { class: "card logout-card" }, [
        vue.createElementVNode(
          "button",
          {
            class: "action-btn danger",
            onClick: _cache[4] || (_cache[4] = (...args) => $options.logout && $options.logout(...args))
          },
          vue.toDisplayString(_ctx.t("my.logout")),
          1
          /* TEXT */
        )
      ]),
      vue.createElementVNode("view", { class: "card about-card" }, [
        vue.createElementVNode(
          "text",
          { class: "section-title" },
          vue.toDisplayString(_ctx.t("my.aboutSoftware")),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "about-desc" },
          vue.toDisplayString(_ctx.t("my.aboutSoftwareDesc")),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "button",
          {
            class: "action-btn secondary",
            onClick: _cache[5] || (_cache[5] = (...args) => $options.goAbout && $options.goAbout(...args))
          },
          vue.toDisplayString(_ctx.t("my.openAboutSoftware")),
          1
          /* TEXT */
        )
      ]),
      vue.createVNode(_component_BottomNav, {
        current: "my",
        userInfo: $data.user
      }, null, 8, ["userInfo"])
    ]);
  }
  const PagesMyMy = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["render", _sfc_render$6], ["__file", "C:/Users/14434/uniapp/pages/my/my.vue"]]);
  const _sfc_main$6 = {
    mixins: [createPageI18n("about")]
  };
  function _sfc_render$5(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createElementVNode("view", { class: "hero" }, [
        vue.createElementVNode(
          "text",
          { class: "hero-kicker" },
          vue.toDisplayString(_ctx.t("about.heroLabel")),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "hero-title" },
          vue.toDisplayString(_ctx.t("about.title")),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "hero-subtitle" },
          vue.toDisplayString(_ctx.t("about.subtitle")),
          1
          /* TEXT */
        )
      ]),
      vue.createElementVNode("view", { class: "card" }, [
        vue.createElementVNode(
          "text",
          { class: "label" },
          vue.toDisplayString(_ctx.t("about.authorLabel")),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "value" },
          vue.toDisplayString(_ctx.t("about.authorValue")),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "label" },
          vue.toDisplayString(_ctx.t("about.contactLabel")),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "value contact" },
          vue.toDisplayString(_ctx.t("about.contactValue")),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "label" },
          vue.toDisplayString(_ctx.t("about.versionLabel")),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "value" },
          vue.toDisplayString(_ctx.t("about.versionValue")),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "label" },
          vue.toDisplayString(_ctx.t("about.noteLabel")),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "value note" },
          vue.toDisplayString(_ctx.t("about.noteValue")),
          1
          /* TEXT */
        )
      ])
    ]);
  }
  const PagesAboutAbout = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["render", _sfc_render$5], ["__file", "C:/Users/14434/uniapp/pages/about/about.vue"]]);
  const workflowValues = [
    "received",
    "ovital_checked",
    "site_surveyed",
    "application_submitted",
    "bureau_approved",
    "replied_to_project",
    "archived"
  ];
  const _sfc_main$5 = {
    mixins: [createPageI18n("admin")],
    components: {
      BottomNav
    },
    data() {
      return {
        currentTab: "heritages",
        heritages: [],
        heritagePage: 1,
        heritagePageSize: 10,
        heritageTotal: 0,
        heritageTotalPages: 1,
        heritageSearchKeyword: "",
        heritageCategory: "",
        heritageCategoryOptions: [
          { value: "GJZ", label: "古建筑" },
          { value: "GMZ", label: "古墓葬" },
          { value: "GYZ", label: "古文化遗址" },
          { value: "SKT", label: "石窟寺及石刻" },
          { value: "JDJW", label: "近现代重要史迹及代表性建筑" },
          { value: "QT", label: "其他" }
        ],
        projects: [],
        editingProject: null,
        form: {
          project_name: "",
          project_unit: "",
          workflow_status: "received",
          construction_content: "",
          project_scale: "",
          project_coordinates: "",
          project_lon: "",
          project_lat: "",
          survey_conclusion: "",
          remarks: ""
        }
      };
    },
    computed: {
      workflowOptions() {
        return workflowValues.map((value) => ({
          value,
          label: getWorkflowLabel(value)
        }));
      },
      workflowLabels() {
        return this.workflowOptions.map((item) => item.label);
      },
      workflowLabel() {
        const selected = this.workflowOptions.find((item) => item.value === this.form.workflow_status);
        return selected ? selected.label : this.t("admin.selectStatus");
      },
      heritageCategorySelectOptions() {
        const allLabel = this.t("admin.allCategoriesOption");
        const optionList = this.heritageCategoryOptions.map((item) => ({
          value: item.value,
          label: item.label
        }));
        return [{ value: "", label: allLabel }, ...optionList];
      },
      heritageCategoryLabels() {
        return this.heritageCategorySelectOptions.map((item) => item.label);
      },
      heritageCategoryIndex() {
        const index = this.heritageCategorySelectOptions.findIndex((item) => item.value === this.heritageCategory);
        return index < 0 ? 0 : index;
      },
      selectedHeritageCategoryLabel() {
        return this.heritageCategorySelectOptions[this.heritageCategoryIndex].label;
      },
      showHeritageFilterSummary() {
        return !!this.heritageSearchKeyword.trim() || !!this.heritageCategory;
      },
      heritageDisplayCount() {
        return this.heritageTotal;
      }
    },
    onLoad(options) {
      const user = getUser();
      if (!isAdminUser(user)) {
        uni.showToast({ title: this.t("admin.noAdminPermission"), icon: "none" });
        uni.reLaunch({ url: "/pages/home/home" });
        return;
      }
      if (options && ["heritages", "projects", "tools"].includes(options.tab)) {
        this.currentTab = options.tab;
      }
      this.loadData();
    },
    methods: {
      getWorkflowText(status) {
        return getWorkflowLabel(status);
      },
      request(url, method = "GET", data = null) {
        return new Promise((resolve, reject) => {
          uni.request({
            url,
            method,
            data,
            header: {
              "Content-Type": "application/json",
              ...getAuthHeader()
            },
            success: resolve,
            fail: reject
          });
        });
      },
      async loadData() {
        uni.showLoading({ title: this.t("common.loading") });
        try {
          await Promise.all([this.loadHeritages(false), this.loadProjects(false)]);
        } catch (error) {
          uni.showToast({ title: this.t("admin.adminDataLoadFailed"), icon: "none" });
        } finally {
          uni.hideLoading();
        }
      },
      async loadHeritages(showLoading = true) {
        if (showLoading) {
          uni.showLoading({ title: this.t("admin.loadingHeritages") });
        }
        try {
          const payload = {
            page: this.heritagePage,
            page_size: this.heritagePageSize
          };
          if (this.heritageSearchKeyword.trim()) {
            payload.q = this.heritageSearchKeyword.trim();
          }
          if (this.heritageCategory) {
            payload.category = this.heritageCategory;
          }
          const heritageRes = await this.request(`${config.API_BASE_URL}/api/admin/heritages`, "GET", {
            ...payload
          });
          this.heritages = heritageRes.data && heritageRes.data.items || [];
          const pagination = heritageRes.data && heritageRes.data.pagination || {};
          this.heritageTotal = pagination.total || 0;
          this.heritageTotalPages = pagination.total_pages || 1;
        } finally {
          if (showLoading) {
            uni.hideLoading();
          }
        }
      },
      async loadProjects(showLoading = true) {
        if (showLoading) {
          uni.showLoading({ title: this.t("admin.loadingProjects") });
        }
        try {
          const projectRes = await this.request(`${config.API_BASE_URL}/api/admin/projects`);
          this.projects = projectRes.data && projectRes.data.items || [];
        } finally {
          if (showLoading) {
            uni.hideLoading();
          }
        }
      },
      async changeHeritagePage(delta) {
        const nextPage = this.heritagePage + delta;
        if (nextPage < 1 || nextPage > this.heritageTotalPages) {
          return;
        }
        this.heritagePage = nextPage;
        await this.loadHeritages();
      },
      onHeritageCategoryChange(event) {
        const selected = this.heritageCategorySelectOptions[event.detail.value];
        this.heritageCategory = selected ? selected.value : "";
      },
      async applyHeritageFilters() {
        this.heritagePage = 1;
        await this.loadHeritages();
      },
      async resetHeritageFilters() {
        this.heritageSearchKeyword = "";
        this.heritageCategory = "";
        this.heritagePage = 1;
        await this.loadHeritages();
      },
      startEdit(item) {
        this.editingProject = item.id;
        this.form = {
          project_name: item.project_name || "",
          project_unit: item.project_unit || "",
          workflow_status: item.workflow_status || "received",
          construction_content: item.construction_content || "",
          project_scale: item.project_scale || "",
          project_coordinates: item.project_coordinates || "",
          project_lon: item.project_lon == null ? "" : String(item.project_lon),
          project_lat: item.project_lat == null ? "" : String(item.project_lat),
          survey_conclusion: item.survey_conclusion || "",
          remarks: item.remarks || ""
        };
        this.currentTab = "projects";
      },
      cancelEdit() {
        this.editingProject = null;
      },
      onWorkflowChange(event) {
        const option = this.workflowOptions[event.detail.value];
        this.form.workflow_status = option.value;
      },
      async saveProject() {
        if (!this.editingProject) {
          return;
        }
        try {
          const response = await this.request(
            `${config.API_BASE_URL}/api/admin/projects/${this.editingProject}`,
            "PUT",
            {
              ...this.form,
              project_lon: this.form.project_lon === "" ? null : Number(this.form.project_lon),
              project_lat: this.form.project_lat === "" ? null : Number(this.form.project_lat),
              related_site_id: null
            }
          );
          if (response.statusCode === 200) {
            uni.showToast({ title: this.t("admin.projectUpdated"), icon: "success" });
            this.editingProject = null;
            this.loadProjects();
            return;
          }
          uni.showToast({ title: this.t("admin.saveFailed"), icon: "none" });
        } catch (error) {
          uni.showToast({ title: this.t("admin.saveFailed"), icon: "none" });
        }
      },
      async openKmlTool() {
        try {
          const response = await this.request(`${config.API_BASE_URL}/api/admin/kml-overlay-entry`);
          const url = response.data && response.data.url;
          if (!url) {
            uni.showToast({ title: this.t("admin.toolAddressMissing"), icon: "none" });
            return;
          }
          uni.navigateTo({ url: `/pages/kml/kml?url=${encodeURIComponent(url)}` });
        } catch (error) {
          uni.showToast({ title: this.t("admin.openFailed"), icon: "none" });
        }
      },
      async openDjangoCollectTool() {
        try {
          const response = await this.request(`${config.API_BASE_URL}/api/admin/collect-entry`);
          const url = response.data && response.data.url;
          if (!url) {
            uni.showToast({ title: this.t("admin.toolAddressMissing"), icon: "none" });
            return;
          }
          uni.navigateTo({ url: `/pages/kml/kml?url=${encodeURIComponent(url)}` });
        } catch (error) {
          uni.showToast({ title: this.t("admin.openFailed"), icon: "none" });
        }
      },
      goCollect() {
        uni.navigateTo({ url: "/pages/collect/collect" });
      },
      goMyRecords() {
        uni.navigateTo({ url: "/pages/collect/my_records" });
      }
    }
  };
  function _sfc_render$4(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_BottomNav = vue.resolveComponent("BottomNav");
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createElementVNode("view", { class: "hero" }, [
        vue.createElementVNode("view", null, [
          vue.createElementVNode(
            "text",
            { class: "hero-kicker" },
            vue.toDisplayString(_ctx.t("admin.heroLabel")),
            1
            /* TEXT */
          ),
          vue.createElementVNode(
            "text",
            { class: "hero-title" },
            vue.toDisplayString(_ctx.t("admin.title")),
            1
            /* TEXT */
          ),
          vue.createElementVNode(
            "text",
            { class: "hero-subtitle" },
            vue.toDisplayString(_ctx.t("admin.subtitle")),
            1
            /* TEXT */
          )
        ])
      ]),
      vue.createElementVNode("view", { class: "tabs" }, [
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["tab", $data.currentTab === "heritages" ? "tab-active" : ""]),
            onClick: _cache[0] || (_cache[0] = ($event) => $data.currentTab = "heritages")
          },
          vue.toDisplayString(_ctx.t("admin.tabHeritages")),
          3
          /* TEXT, CLASS */
        ),
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["tab", $data.currentTab === "projects" ? "tab-active" : ""]),
            onClick: _cache[1] || (_cache[1] = ($event) => $data.currentTab = "projects")
          },
          vue.toDisplayString(_ctx.t("admin.tabProjects")),
          3
          /* TEXT, CLASS */
        ),
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["tab", $data.currentTab === "tools" ? "tab-active" : ""]),
            onClick: _cache[2] || (_cache[2] = ($event) => $data.currentTab = "tools")
          },
          vue.toDisplayString(_ctx.t("admin.tabTools")),
          3
          /* TEXT, CLASS */
        )
      ]),
      vue.createElementVNode("scroll-view", {
        "scroll-y": "",
        class: "content-scroll"
      }, [
        $data.currentTab === "heritages" ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "section"
        }, [
          vue.createElementVNode("view", { class: "section-header" }, [
            vue.createElementVNode(
              "text",
              { class: "section-title" },
              vue.toDisplayString(_ctx.t("admin.allHeritages")),
              1
              /* TEXT */
            ),
            vue.createElementVNode(
              "text",
              { class: "section-count" },
              vue.toDisplayString(_ctx.t("admin.recordCount", { count: $options.heritageDisplayCount })),
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("view", { class: "filters-card" }, [
            vue.createElementVNode("view", { class: "filters-row" }, [
              vue.withDirectives(vue.createElementVNode("input", {
                "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $data.heritageSearchKeyword = $event),
                class: "filter-input",
                placeholder: _ctx.t("admin.searchHeritagePlaceholder")
              }, null, 8, ["placeholder"]), [
                [
                  vue.vModelText,
                  $data.heritageSearchKeyword,
                  void 0,
                  { trim: true }
                ]
              ]),
              vue.createElementVNode("picker", {
                class: "filter-picker",
                range: $options.heritageCategoryLabels,
                value: $options.heritageCategoryIndex,
                onChange: _cache[4] || (_cache[4] = (...args) => $options.onHeritageCategoryChange && $options.onHeritageCategoryChange(...args))
              }, [
                vue.createElementVNode(
                  "view",
                  { class: "picker-text" },
                  vue.toDisplayString($options.selectedHeritageCategoryLabel),
                  1
                  /* TEXT */
                )
              ], 40, ["range", "value"])
            ]),
            vue.createElementVNode("view", { class: "filter-actions" }, [
              vue.createElementVNode(
                "button",
                {
                  class: "ghost-lite-btn",
                  onClick: _cache[5] || (_cache[5] = (...args) => $options.resetHeritageFilters && $options.resetHeritageFilters(...args))
                },
                vue.toDisplayString(_ctx.t("admin.resetFilters")),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "button",
                {
                  class: "primary-btn",
                  onClick: _cache[6] || (_cache[6] = (...args) => $options.applyHeritageFilters && $options.applyHeritageFilters(...args))
                },
                vue.toDisplayString(_ctx.t("common.search")),
                1
                /* TEXT */
              )
            ])
          ]),
          $options.showHeritageFilterSummary ? (vue.openBlock(), vue.createElementBlock(
            "text",
            {
              key: 0,
              class: "filter-summary"
            },
            vue.toDisplayString(_ctx.t("admin.filterResultSummary", { count: $data.heritageTotal, page: $data.heritagePage })),
            1
            /* TEXT */
          )) : vue.createCommentVNode("v-if", true),
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($data.heritages, (item) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: item.id,
                class: "card"
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "card-title" },
                  vue.toDisplayString(item.name),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "card-text" },
                  vue.toDisplayString(_ctx.t("admin.sipCode", { value: item.sip_code || _ctx.t("common.notAvailable") })),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "card-text" },
                  vue.toDisplayString(_ctx.t("admin.categoryLevel", { category: item.category || _ctx.t("common.notAvailable"), level: item.level || _ctx.t("common.notAvailable") })),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "card-text" },
                  vue.toDisplayString(_ctx.t("admin.address", { value: item.address || _ctx.t("common.notAvailable") })),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "card-text" },
                  vue.toDisplayString(_ctx.t("admin.coordinates", { longitude: item.longitude || "-", latitude: item.latitude || "-" })),
                  1
                  /* TEXT */
                )
              ]);
            }),
            128
            /* KEYED_FRAGMENT */
          )),
          !$data.heritages.length ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "card"
          }, [
            vue.createElementVNode(
              "text",
              { class: "card-text" },
              vue.toDisplayString(_ctx.t("admin.noHeritageMatched")),
              1
              /* TEXT */
            )
          ])) : vue.createCommentVNode("v-if", true),
          $data.heritageTotalPages > 1 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 2,
            class: "pagination-bar"
          }, [
            vue.createElementVNode("button", {
              class: "ghost-lite-btn page-btn",
              disabled: $data.heritagePage <= 1,
              onClick: _cache[7] || (_cache[7] = ($event) => $options.changeHeritagePage(-1))
            }, vue.toDisplayString(_ctx.t("admin.prevPage")), 9, ["disabled"]),
            vue.createElementVNode(
              "text",
              { class: "page-text" },
              vue.toDisplayString(_ctx.t("admin.pageInfo", { page: $data.heritagePage, total: $data.heritageTotalPages })),
              1
              /* TEXT */
            ),
            vue.createElementVNode("button", {
              class: "ghost-lite-btn page-btn",
              disabled: $data.heritagePage >= $data.heritageTotalPages,
              onClick: _cache[8] || (_cache[8] = ($event) => $options.changeHeritagePage(1))
            }, vue.toDisplayString(_ctx.t("admin.nextPage")), 9, ["disabled"])
          ])) : vue.createCommentVNode("v-if", true)
        ])) : vue.createCommentVNode("v-if", true),
        $data.currentTab === "projects" ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "section"
        }, [
          vue.createElementVNode("view", { class: "section-header" }, [
            vue.createElementVNode(
              "text",
              { class: "section-title" },
              vue.toDisplayString(_ctx.t("admin.projectsTitle")),
              1
              /* TEXT */
            ),
            vue.createElementVNode(
              "text",
              { class: "section-count" },
              vue.toDisplayString(_ctx.t("admin.recordCount", { count: $data.projects.length })),
              1
              /* TEXT */
            )
          ]),
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($data.projects, (item) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: item.id,
                class: "card"
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "card-title" },
                  vue.toDisplayString(item.project_name),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "badge" },
                  vue.toDisplayString($options.getWorkflowText(item.workflow_status)),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "card-text" },
                  vue.toDisplayString(_ctx.t("admin.projectUnit", { value: item.project_unit || _ctx.t("common.notFilled") })),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "card-text" },
                  vue.toDisplayString(_ctx.t("admin.relatedSite", { value: item.related_site_name || _ctx.t("common.notLinked") })),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "card-text" },
                  vue.toDisplayString(_ctx.t("admin.coordinates", { longitude: item.project_lon || "-", latitude: item.project_lat || "-" })),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "card-text" },
                  vue.toDisplayString(_ctx.t("admin.conclusion", { value: item.survey_conclusion || _ctx.t("common.notAvailable") })),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("button", {
                  class: "primary-btn",
                  onClick: ($event) => $options.startEdit(item)
                }, vue.toDisplayString(_ctx.t("admin.editProjectInfo")), 9, ["onClick"])
              ]);
            }),
            128
            /* KEYED_FRAGMENT */
          )),
          $data.editingProject ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "editor-panel"
          }, [
            vue.createElementVNode(
              "text",
              { class: "editor-title" },
              vue.toDisplayString(_ctx.t("admin.editProjectTitle", { name: $data.form.project_name || _ctx.t("common.notAvailable") })),
              1
              /* TEXT */
            ),
            vue.withDirectives(vue.createElementVNode("input", {
              "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => $data.form.project_name = $event),
              class: "input",
              placeholder: _ctx.t("admin.projectNamePlaceholder")
            }, null, 8, ["placeholder"]), [
              [vue.vModelText, $data.form.project_name]
            ]),
            vue.withDirectives(vue.createElementVNode("input", {
              "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => $data.form.project_unit = $event),
              class: "input",
              placeholder: _ctx.t("admin.projectUnitPlaceholder")
            }, null, 8, ["placeholder"]), [
              [vue.vModelText, $data.form.project_unit]
            ]),
            vue.createElementVNode("picker", {
              class: "picker",
              range: $options.workflowLabels,
              onChange: _cache[11] || (_cache[11] = (...args) => $options.onWorkflowChange && $options.onWorkflowChange(...args))
            }, [
              vue.createElementVNode(
                "view",
                { class: "picker-text" },
                vue.toDisplayString(_ctx.t("admin.currentStatus", { value: $options.workflowLabel })),
                1
                /* TEXT */
              )
            ], 40, ["range"]),
            vue.withDirectives(vue.createElementVNode("textarea", {
              "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => $data.form.construction_content = $event),
              class: "textarea",
              placeholder: _ctx.t("admin.constructionContentPlaceholder")
            }, null, 8, ["placeholder"]), [
              [vue.vModelText, $data.form.construction_content]
            ]),
            vue.withDirectives(vue.createElementVNode("input", {
              "onUpdate:modelValue": _cache[13] || (_cache[13] = ($event) => $data.form.project_scale = $event),
              class: "input",
              placeholder: _ctx.t("admin.projectScalePlaceholder")
            }, null, 8, ["placeholder"]), [
              [vue.vModelText, $data.form.project_scale]
            ]),
            vue.withDirectives(vue.createElementVNode("input", {
              "onUpdate:modelValue": _cache[14] || (_cache[14] = ($event) => $data.form.project_coordinates = $event),
              class: "input",
              placeholder: _ctx.t("admin.projectCoordinatesPlaceholder")
            }, null, 8, ["placeholder"]), [
              [vue.vModelText, $data.form.project_coordinates]
            ]),
            vue.withDirectives(vue.createElementVNode("input", {
              "onUpdate:modelValue": _cache[15] || (_cache[15] = ($event) => $data.form.project_lon = $event),
              class: "input",
              placeholder: _ctx.t("admin.projectLongitudePlaceholder"),
              type: "digit"
            }, null, 8, ["placeholder"]), [
              [vue.vModelText, $data.form.project_lon]
            ]),
            vue.withDirectives(vue.createElementVNode("input", {
              "onUpdate:modelValue": _cache[16] || (_cache[16] = ($event) => $data.form.project_lat = $event),
              class: "input",
              placeholder: _ctx.t("admin.projectLatitudePlaceholder"),
              type: "digit"
            }, null, 8, ["placeholder"]), [
              [vue.vModelText, $data.form.project_lat]
            ]),
            vue.withDirectives(vue.createElementVNode("textarea", {
              "onUpdate:modelValue": _cache[17] || (_cache[17] = ($event) => $data.form.survey_conclusion = $event),
              class: "textarea",
              placeholder: _ctx.t("admin.surveyConclusionPlaceholder")
            }, null, 8, ["placeholder"]), [
              [vue.vModelText, $data.form.survey_conclusion]
            ]),
            vue.withDirectives(vue.createElementVNode("textarea", {
              "onUpdate:modelValue": _cache[18] || (_cache[18] = ($event) => $data.form.remarks = $event),
              class: "textarea",
              placeholder: _ctx.t("admin.remarksPlaceholder")
            }, null, 8, ["placeholder"]), [
              [vue.vModelText, $data.form.remarks]
            ]),
            vue.createElementVNode("view", { class: "editor-actions" }, [
              vue.createElementVNode(
                "button",
                {
                  class: "ghost-lite-btn",
                  onClick: _cache[19] || (_cache[19] = (...args) => $options.cancelEdit && $options.cancelEdit(...args))
                },
                vue.toDisplayString(_ctx.t("common.cancel")),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "button",
                {
                  class: "primary-btn",
                  onClick: _cache[20] || (_cache[20] = (...args) => $options.saveProject && $options.saveProject(...args))
                },
                vue.toDisplayString(_ctx.t("admin.saveChanges")),
                1
                /* TEXT */
              )
            ])
          ])) : vue.createCommentVNode("v-if", true)
        ])) : vue.createCommentVNode("v-if", true),
        $data.currentTab === "tools" ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 2,
          class: "section"
        }, [
          vue.createElementVNode("view", { class: "card" }, [
            vue.createElementVNode(
              "text",
              { class: "card-title" },
              vue.toDisplayString(_ctx.t("admin.kmlTitle")),
              1
              /* TEXT */
            ),
            vue.createElementVNode(
              "text",
              { class: "card-text" },
              vue.toDisplayString(_ctx.t("admin.kmlDesc")),
              1
              /* TEXT */
            ),
            vue.createElementVNode(
              "button",
              {
                class: "primary-btn",
                onClick: _cache[21] || (_cache[21] = (...args) => $options.openKmlTool && $options.openKmlTool(...args))
              },
              vue.toDisplayString(_ctx.t("admin.openKml")),
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("view", {
            class: "card",
            style: { "margin-top": "20rpx" }
          }, [
            vue.createElementVNode("text", { class: "card-title" }, "Django管理端 · 鄯善县不可移动文物采集"),
            vue.createElementVNode("text", { class: "card-text" }, "进入 Django 管理端采集页面，支持现场采集表单填写、照片上传与登记记录管理。"),
            vue.createElementVNode("button", {
              class: "primary-btn",
              onClick: _cache[22] || (_cache[22] = (...args) => $options.openDjangoCollectTool && $options.openDjangoCollectTool(...args))
            }, "打开采集管理页")
          ]),
          vue.createElementVNode("view", {
            class: "card",
            style: { "margin-top": "20rpx" }
          }, [
            vue.createElementVNode("text", { class: "card-title" }, "四普现场数据采集"),
            vue.createElementVNode("text", { class: "card-text" }, "在现场对不可移动文物点进行登记采集，支持 GPS 定位、照片上传并自动加水印。"),
            vue.createElementVNode("view", { style: { "display": "flex", "gap": "16rpx", "margin-top": "16rpx" } }, [
              vue.createElementVNode("button", {
                class: "primary-btn",
                style: { "flex": "2" },
                onClick: _cache[23] || (_cache[23] = (...args) => $options.goCollect && $options.goCollect(...args))
              }, "开始采集"),
              vue.createElementVNode("button", {
                class: "ghost-lite-btn",
                style: { "flex": "1" },
                onClick: _cache[24] || (_cache[24] = (...args) => $options.goMyRecords && $options.goMyRecords(...args))
              }, "我的采集")
            ])
          ])
        ])) : vue.createCommentVNode("v-if", true)
      ]),
      vue.createVNode(_component_BottomNav, { current: "admin" })
    ]);
  }
  const PagesAdminAdmin = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["render", _sfc_render$4], ["__file", "C:/Users/14434/uniapp/pages/admin/admin.vue"]]);
  const _sfc_main$4 = {
    mixins: [createPageI18n("kml")],
    components: {
      BottomNav
    },
    data() {
      return {
        url: `${config.WEB_BASE_URL}/admin/kml-overlay-check/`
      };
    },
    onLoad(options) {
      if (options && options.url) {
        this.url = decodeURIComponent(options.url);
      }
    }
  };
  function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_BottomNav = vue.resolveComponent("BottomNav");
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createElementVNode("view", { class: "notice" }, [
        vue.createElementVNode(
          "text",
          { class: "kicker" },
          vue.toDisplayString(_ctx.t("kml.heroLabel")),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "title" },
          vue.toDisplayString(_ctx.t("kml.title")),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "desc" },
          vue.toDisplayString(_ctx.t("kml.subtitle")),
          1
          /* TEXT */
        )
      ]),
      vue.createElementVNode("web-view", { src: $data.url }, null, 8, ["src"]),
      vue.createVNode(_component_BottomNav, { current: "admin" })
    ]);
  }
  const PagesKmlKml = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["render", _sfc_render$3], ["__file", "C:/Users/14434/uniapp/pages/kml/kml.vue"]]);
  const DEM_TIMEOUT_MS = 15e3;
  const GPS_TIMEOUT_MS = 12e3;
  const BARO_TIMEOUT_MS = 3e3;
  const STD_PRESSURE_HPA = 1013.25;
  const BARO_PRESSURE_MIN_HPA = 300;
  const BARO_PRESSURE_MAX_HPA = 1100;
  const ALTITUDE_MIN_M = -500;
  const ALTITUDE_MAX_M = 9e3;
  const _sfc_main$3 = {
    __name: "AltitudeCollect",
    props: {
      modelValue: {
        type: [String, Number],
        default: ""
      },
      demApiUrl: {
        type: String,
        // script setup 中 defineProps 会被提升，默认值不能引用本地声明变量。
        default: `${config.API_BASE_URL}/api/dem-elevation-lookup/`
      }
    },
    emits: ["update:modelValue", "collect-done"],
    setup(__props, { expose: __expose, emit: __emit }) {
      __expose();
      const props = __props;
      const emit = __emit;
      const altitude = vue.ref(props.modelValue != null ? String(props.modelValue) : "");
      const collecting = vue.ref(false);
      const statusMsg = vue.ref("");
      const statusClass = vue.ref("");
      const detailText = vue.ref("");
      const sourceLabel = vue.ref("");
      const sourceBadgeClass = vue.ref("");
      vue.watch(
        () => props.modelValue,
        (v) => {
          if (v !== null && v !== void 0) {
            altitude.value = String(v);
          }
        }
      );
      function onManualInput(e) {
        altitude.value = e.detail.value;
        sourceLabel.value = "手动录入";
        sourceBadgeClass.value = "badge--manual";
        statusMsg.value = "已切换为手动输入，可录入 RTK 手簿高程";
        statusClass.value = "alt-status--info";
        detailText.value = "";
        emit("update:modelValue", altitude.value);
      }
      function _toValidHardwareAltitude(value) {
        const n = Number(value);
        if (!Number.isFinite(n))
          return null;
        if (Math.abs(n) < 1e-6)
          return null;
        if (n < ALTITUDE_MIN_M || n > ALTITUDE_MAX_M)
          return null;
        return n;
      }
      function _toValidPressureHpa(value) {
        const p = Number(value);
        if (!Number.isFinite(p))
          return null;
        if (p < BARO_PRESSURE_MIN_HPA || p > BARO_PRESSURE_MAX_HPA)
          return null;
        return p;
      }
      function _toFixed2(value) {
        return Number(value).toFixed(2);
      }
      function pressureToAltitude(pressureHpa, refPressureHpa = STD_PRESSURE_HPA) {
        return 44330 * (1 - Math.pow(pressureHpa / refPressureHpa, 1 / 5.255));
      }
      function fuseHardwareAltitude(gpsAlt, baroAlt, accuracy) {
        const acc = Number.isFinite(Number(accuracy)) ? Number(accuracy) : 999;
        const gpsW = acc <= 5 ? 0.6 : acc <= 15 ? 0.5 : acc <= 50 ? 0.4 : 0.3;
        return gpsAlt * gpsW + baroAlt * (1 - gpsW);
      }
      function _mapGpsError(err) {
        const raw = String(err && (err.message || err.errMsg) || err || "");
        const msg = raw.toLowerCase();
        if (msg.includes("permission") || msg.includes("denied") || msg.includes("auth")) {
          return "定位权限被拒绝，请在系统设置中开启定位权限";
        }
        if (msg.includes("timeout")) {
          return "GPS 搜星超时，请移至开阔区域后重试";
        }
        if (msg.includes("provider") || msg.includes("gps")) {
          return "GPS 可能未开启，请先打开系统定位并重试";
        }
        return "获取原生 GPS 失败，请重试";
      }
      function getNativeGpsPosition() {
        return new Promise((resolve, reject) => {
          try {
            plus.geolocation.getCurrentPosition(
              (position) => {
                const coords = position && position.coords ? position.coords : {};
                resolve({
                  longitude: Number(coords.longitude),
                  latitude: Number(coords.latitude),
                  altitude: coords.altitude != null ? Number(coords.altitude) : null,
                  accuracy: coords.accuracy != null ? Number(coords.accuracy) : null
                });
              },
              (err) => {
                reject(new Error(_mapGpsError(err)));
              },
              {
                provider: "gps",
                enableHighAccuracy: true,
                coordsType: "wgs84",
                timeout: GPS_TIMEOUT_MS,
                maximumAge: 0,
                geocode: false
              }
            );
          } catch (e) {
            reject(new Error(_mapGpsError(e)));
          }
        });
      }
      function getBarometerPressureByPlus() {
        return new Promise((resolve) => {
          let done = false;
          const finish = (val) => {
            if (done)
              return;
            done = true;
            resolve(val);
          };
          const timer = setTimeout(() => finish(null), BARO_TIMEOUT_MS);
          try {
            if (typeof plus !== "undefined" && plus.sensors && typeof plus.sensors.startBarometer === "function") {
              plus.sensors.startBarometer(
                { frequency: "fastest" },
                (event) => {
                  try {
                    plus.sensors.stopBarometer();
                  } catch (_) {
                  }
                  clearTimeout(timer);
                  const raw = event && (event.pressure ?? (event.value && event.value[0]));
                  if (raw == null) {
                    finish(null);
                    return;
                  }
                  const num = Number(raw);
                  if (!Number.isFinite(num)) {
                    finish(null);
                    return;
                  }
                  finish(num > 5e4 ? num / 100 : num);
                },
                () => {
                  clearTimeout(timer);
                  finish(null);
                }
              );
              return;
            }
          } catch (_) {
            clearTimeout(timer);
            finish(null);
            return;
          }
          clearTimeout(timer);
          finish(null);
        });
      }
      async function buildHardwareAltitude(gps) {
        const gpsAlt = _toValidHardwareAltitude(gps && gps.altitude);
        const pressure = await getBarometerPressureByPlus();
        let baroAlt = null;
        if (Number.isFinite(Number(pressure))) {
          const validPressure = _toValidPressureHpa(pressure);
          if (validPressure == null) {
            return {
              altitude: gpsAlt,
              source: gpsAlt != null ? "gps-only" : "none",
              detail: gpsAlt != null ? `硬件来源: GPS ${gpsAlt.toFixed(2)}m（气压值异常已忽略）` : "硬件来源: 气压值异常且GPS海拔无效"
            };
          }
          if (gpsAlt != null) {
            const refPressure = STD_PRESSURE_HPA * Math.pow(1 - gpsAlt / 44330, 5.255);
            baroAlt = _toValidHardwareAltitude(pressureToAltitude(validPressure, refPressure));
          } else {
            baroAlt = _toValidHardwareAltitude(pressureToAltitude(validPressure, STD_PRESSURE_HPA));
          }
        }
        if (gpsAlt != null && baroAlt != null) {
          const fused = _toValidHardwareAltitude(fuseHardwareAltitude(gpsAlt, baroAlt, gps && gps.accuracy));
          if (fused != null) {
            return {
              altitude: fused,
              source: "gps+barometer",
              detail: `硬件融合: GPS ${gpsAlt.toFixed(2)}m + 气压推算 ${baroAlt.toFixed(2)}m`
            };
          }
        }
        if (gpsAlt != null) {
          return {
            altitude: gpsAlt,
            source: "gps-only",
            detail: `硬件来源: GPS ${gpsAlt.toFixed(2)}m（设备无气压计或读数不可用）`
          };
        }
        if (baroAlt != null) {
          return {
            altitude: baroAlt,
            source: "barometer-only",
            detail: `硬件来源: 气压计 ${baroAlt.toFixed(2)}m（GPS海拔无效，已通过范围校验）`
          };
        }
        return {
          altitude: null,
          source: "none",
          detail: "硬件来源: GPS海拔无效且设备未返回可用气压值"
        };
      }
      function requestDemAltitude(longitude, latitude) {
        return new Promise((resolve, reject) => {
          const fallbackDirectUrl = `${config.WEB_BASE_URL}/api/dem-elevation-lookup/`;
          const fallbackAppApiUrl = `${config.WEB_BASE_URL}/app-api/api/dem-elevation-lookup/`;
          const fallbackByReplace = `${String(config.API_BASE_URL || "").replace(/\/app-api\/?$/, "")}/api/dem-elevation-lookup/`;
          const urlCandidates = Array.from(
            new Set([props.demApiUrl, fallbackDirectUrl, fallbackAppApiUrl, fallbackByReplace].filter(Boolean))
          );
          let attemptIndex = 0;
          const tryNext = (lastError) => {
            if (attemptIndex >= urlCandidates.length) {
              reject(lastError || new Error("DEM 请求失败"));
              return;
            }
            const targetUrl = urlCandidates[attemptIndex++];
            uni.request({
              url: targetUrl,
              method: "POST",
              timeout: DEM_TIMEOUT_MS,
              sslVerify: false,
              header: {
                "Content-Type": "application/json"
              },
              data: {
                longitude,
                latitude
              },
              success: (res) => {
                const data = res && res.data ? res.data : {};
                if (res.statusCode !== 200) {
                  tryNext(new Error(`DEM HTTP ${res.statusCode || "ERR"} @ ${targetUrl}`));
                  return;
                }
                const demOk = data.code === 200 || data.success === true || data.status === "success";
                const demAltitude = data.altitude ?? data.elevation ?? (data.data && (data.data.altitude ?? data.data.elevation));
                if (!demOk || demAltitude === null || demAltitude === void 0 || Number.isNaN(Number(demAltitude))) {
                  tryNext(new Error(`DEM 返回无有效高程 @ ${targetUrl}`));
                  return;
                }
                resolve(Number(demAltitude));
              },
              fail: (err) => {
                tryNext(new Error(`DEM 请求失败: ${err && err.errMsg || "network fail"} @ ${targetUrl}`));
              }
            });
          };
          tryNext();
        });
      }
      function requestHardwareAltitudeFallback() {
        return new Promise((resolve) => {
          uni.getLocation({
            type: "wgs84",
            isHighAccuracy: true,
            altitude: true,
            highAccuracyExpireTime: 6e3,
            success: (res) => {
              resolve(_toValidHardwareAltitude(res && res.altitude));
            },
            fail: () => {
              resolve(null);
            }
          });
        });
      }
      async function startCollect() {
        if (collecting.value)
          return;
        collecting.value = true;
        statusMsg.value = "正在调用原生 GPS 并请求 DEM 校准，请稍候…";
        statusClass.value = "alt-status--info";
        sourceLabel.value = "";
        sourceBadgeClass.value = "";
        detailText.value = "";
        try {
          const gps = await getNativeGpsPosition();
          const longitude = Number(gps.longitude);
          const latitude = Number(gps.latitude);
          const hardware = await buildHardwareAltitude(gps);
          let hardwareAltitude = hardware.altitude;
          const accuracy = Number.isFinite(Number(gps.accuracy)) ? Number(gps.accuracy) : null;
          if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
            throw new Error("GPS 返回经纬度无效");
          }
          if (hardwareAltitude == null) {
            hardwareAltitude = await requestHardwareAltitudeFallback();
          }
          let chosenAltitude = null;
          let chosenLabel = "";
          let chosenBadgeClass = "";
          let chosenStatus = "";
          let chosenStatusClass = "";
          let demFailureReason = "";
          try {
            const demAltitude = await requestDemAltitude(longitude, latitude);
            chosenAltitude = demAltitude;
            chosenLabel = "🟢 DEM国家高程校准";
            chosenBadgeClass = "badge--dem";
            chosenStatus = "后端 DEM 反查成功，已使用国家高程校准值";
            chosenStatusClass = "alt-status--success";
          } catch (demErr) {
            demFailureReason = demErr && demErr.message || "DEM 请求失败";
            if (hardwareAltitude != null) {
              chosenAltitude = hardwareAltitude;
              chosenLabel = "🟡 手机硬件高程(无网保底)";
              chosenBadgeClass = "badge--hardware";
              chosenStatus = "DEM 不可用，已降级为手机硬件海拔保底";
              chosenStatusClass = "alt-status--success";
            } else {
              chosenAltitude = 0;
              chosenLabel = "🔴 信号断绝，请手动输入RTK手簿数据";
              chosenBadgeClass = "badge--critical";
              chosenStatus = "网络中断且硬件海拔无效，已填充 0.00，请立即手动录入 RTK 数据";
              chosenStatusClass = "alt-status--warn";
            }
          }
          altitude.value = _toFixed2(chosenAltitude);
          sourceLabel.value = chosenLabel;
          sourceBadgeClass.value = chosenBadgeClass;
          statusMsg.value = chosenStatus;
          statusClass.value = chosenStatusClass;
          detailText.value = `经度 ${longitude.toFixed(8)} ｜ 纬度 ${latitude.toFixed(8)} ｜ ${hardware.detail} ｜ 精度 ${accuracy != null ? `±${Math.round(accuracy)}m` : "未知"}${demFailureReason ? ` ｜ DEM失败: ${demFailureReason}` : ""}`;
          emit("update:modelValue", altitude.value);
          emit("collect-done", {
            longitude,
            latitude,
            accuracy,
            altitude: Number(altitude.value),
            hardwareAltitude,
            hardwareSource: hardware.source,
            source: chosenLabel
          });
          uni.showToast({
            title: `海拔 ${altitude.value}m`,
            icon: "none",
            duration: 1800
          });
        } catch (err) {
          statusMsg.value = err && err.message || "采集失败，请检查定位权限后重试";
          statusClass.value = "alt-status--error";
          sourceLabel.value = "定位失败";
          sourceBadgeClass.value = "badge--critical";
          detailText.value = "";
          uni.showToast({ title: statusMsg.value, icon: "none", duration: 2600 });
        } finally {
          collecting.value = false;
        }
      }
      const __returned__ = { DEM_TIMEOUT_MS, GPS_TIMEOUT_MS, BARO_TIMEOUT_MS, STD_PRESSURE_HPA, BARO_PRESSURE_MIN_HPA, BARO_PRESSURE_MAX_HPA, ALTITUDE_MIN_M, ALTITUDE_MAX_M, props, emit, altitude, collecting, statusMsg, statusClass, detailText, sourceLabel, sourceBadgeClass, onManualInput, _toValidHardwareAltitude, _toValidPressureHpa, _toFixed2, pressureToAltitude, fuseHardwareAltitude, _mapGpsError, getNativeGpsPosition, getBarometerPressureByPlus, buildHardwareAltitude, requestDemAltitude, requestHardwareAltitudeFallback, startCollect, ref: vue.ref, watch: vue.watch, get config() {
        return config;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "alt-widget" }, [
      vue.createElementVNode("view", { class: "alt-header" }, [
        vue.createElementVNode("text", { class: "alt-label" }, "海拔高程（米）"),
        $setup.sourceLabel ? (vue.openBlock(), vue.createElementBlock(
          "view",
          {
            key: 0,
            class: vue.normalizeClass(["alt-badge", $setup.sourceBadgeClass])
          },
          [
            vue.createElementVNode(
              "text",
              { class: "alt-badge-text" },
              vue.toDisplayString($setup.sourceLabel),
              1
              /* TEXT */
            )
          ],
          2
          /* CLASS */
        )) : vue.createCommentVNode("v-if", true)
      ]),
      vue.createElementVNode("view", { class: "alt-row" }, [
        vue.createElementVNode("input", {
          value: $setup.altitude,
          type: "digit",
          class: "alt-input",
          placeholder: "自动采集 或 手动填写",
          onInput: $setup.onManualInput
        }, null, 40, ["value"]),
        vue.createElementVNode("button", {
          class: vue.normalizeClass(["alt-btn", $setup.collecting ? "alt-btn--loading" : ""]),
          disabled: $setup.collecting,
          "hover-class": "alt-btn--press",
          onClick: $setup.startCollect
        }, [
          !$setup.collecting ? (vue.openBlock(), vue.createElementBlock("text", { key: 0 }, "📡 一键采集")) : (vue.openBlock(), vue.createElementBlock("text", {
            key: 1,
            class: "alt-pulse"
          }, "采集中…"))
        ], 10, ["disabled"])
      ]),
      $setup.statusMsg ? (vue.openBlock(), vue.createElementBlock(
        "view",
        {
          key: 0,
          class: vue.normalizeClass(["alt-status", $setup.statusClass])
        },
        [
          vue.createElementVNode(
            "text",
            { class: "alt-status-text" },
            vue.toDisplayString($setup.statusMsg),
            1
            /* TEXT */
          )
        ],
        2
        /* CLASS */
      )) : vue.createCommentVNode("v-if", true),
      $setup.detailText ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 1,
        class: "alt-detail"
      }, [
        vue.createElementVNode(
          "text",
          { class: "alt-detail-text" },
          vue.toDisplayString($setup.detailText),
          1
          /* TEXT */
        )
      ])) : vue.createCommentVNode("v-if", true)
    ]);
  }
  const AltitudeCollect = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$2], ["__scopeId", "data-v-76fd7a0e"], ["__file", "C:/Users/14434/uniapp/components/AltitudeCollect.vue"]]);
  const API$1 = config.API_BASE_URL;
  const _sfc_main$2 = {
    components: { AltitudeCollect },
    data() {
      return {
        step: 0,
        steps: ["基础信息", "地理位置", "状态权属", "现场照片"],
        surveyCodeAuto: true,
        submitting: false,
        submitDone: false,
        progressMsg: "",
        generatedSurveyCode: "",
        currentUser: {},
        // 表单数据
        form: {
          survey_code: "",
          name: "",
          former_name: "",
          era: "",
          category: "",
          province: "",
          city: "",
          county: "",
          township: "",
          village: "",
          address: "",
          longitude: "",
          latitude: "",
          altitude: "",
          protection_level: "DS",
          ownership: "state",
          preservation_status: "一般",
          description: ""
        },
        errors: {},
        // 定位
        locating: false,
        locationAccuracy: null,
        // 照片列表，每项 { path: String, status: 'pending'|'uploading'|'done'|'error' }
        photos: [],
        // 表单选项（从服务端拉取）
        categoryChoices: [],
        protectionLevelChoices: [],
        ownershipChoices: [],
        preservationStatusChoices: [],
        collectUnit: "文物管理部门",
        watermarkCanvas: {
          width: 1,
          height: 1
        }
      };
    },
    computed: {
      // ── Picker 选项数组 ──────────────────────────────────
      categoryLabels() {
        return this.categoryChoices.map((c) => c.label);
      },
      categoryIndex() {
        const idx = this.categoryChoices.findIndex((c) => c.value === this.form.category);
        return idx >= 0 ? idx : 0;
      },
      protectionLabels() {
        return this.protectionLevelChoices.map((c) => c.label);
      },
      protectionIndex() {
        const idx = this.protectionLevelChoices.findIndex((c) => c.value === this.form.protection_level);
        return idx >= 0 ? idx : 0;
      },
      ownershipLabels() {
        return this.ownershipChoices.map((c) => c.label);
      },
      ownershipIndex() {
        const idx = this.ownershipChoices.findIndex((c) => c.value === this.form.ownership);
        return idx >= 0 ? idx : 0;
      },
      preservationLabels() {
        return this.preservationStatusChoices.map((c) => c.label);
      },
      preservationIndex() {
        const idx = this.preservationStatusChoices.findIndex((c) => c.value === this.form.preservation_status);
        return idx >= 0 ? idx : 0;
      },
      // ── GPS 状态 badge ───────────────────────────────────
      gpsBadgeClass() {
        if (this.locating)
          return "badge-loading";
        if (this.form.longitude)
          return "badge-ok";
        return "badge-idle";
      },
      gpsBadgeText() {
        if (this.locating)
          return "定位中…";
        if (this.form.longitude)
          return `已定位 ±${this.locationAccuracy || "?"}m`;
        return "未定位";
      }
    },
    onLoad() {
      if (!getToken()) {
        uni.reLaunch({ url: "/pages/index/index" });
        return;
      }
      this.currentUser = getUser() || {};
      this.loadFormMeta();
    },
    methods: {
      getWatermarkUserName() {
        return this.currentUser.full_name || this.currentUser.username || "未登录用户";
      },
      buildWatermarkText(time) {
        const collector = this.getWatermarkUserName();
        const name = this.form.name || "未命名文物";
        const longitude = Number(this.form.longitude || 0).toFixed(6);
        const latitude = Number(this.form.latitude || 0).toFixed(6);
        return `采集人: ${collector}
文物名称: ${name}
采集时间: ${time}
坐标: ${longitude}, ${latitude}`;
      },
      cleanText(value) {
        return String(value || "").trim();
      },
      onAltitudeCollectDone(info) {
        if (!info || typeof info !== "object")
          return;
        if (info.longitude != null && info.latitude != null) {
          this.form.longitude = Number(info.longitude).toFixed(8);
          this.form.latitude = Number(info.latitude).toFixed(8);
        }
        if (info.accuracy != null) {
          this.locationAccuracy = Math.round(info.accuracy);
        }
      },
      // ── 拉取表单选项 ──────────────────────────────────────
      loadFormMeta() {
        uni.request({
          url: `${API$1}/api/collect/form-meta`,
          header: { Authorization: `Bearer ${getToken()}` },
          success: (res) => {
            if (res.statusCode === 200) {
              const d = res.data;
              this.categoryChoices = d.category_choices || [];
              this.protectionLevelChoices = d.protection_level_choices || [];
              this.ownershipChoices = d.ownership_choices || [];
              this.preservationStatusChoices = d.preservation_status_choices || [];
              this.collectUnit = d.collect_unit || "文物管理部门";
              if (this.categoryChoices.length)
                this.form.category = this.categoryChoices[0].value;
              if (this.protectionLevelChoices.length) {
                const ds = this.protectionLevelChoices.find((c) => c.value === "DS");
                if (ds)
                  this.form.protection_level = "DS";
              }
            }
          },
          fail: () => {
            this.categoryChoices = [
              { value: "GWZ", label: "古文化遗址" },
              { value: "GMZ", label: "古墓葬" },
              { value: "GJZ", label: "古建筑" },
              { value: "SKT", label: "石窟寺及石刻" },
              { value: "JDJW", label: "近现代重要史迹及代表性建筑" },
              { value: "QT", label: "其他" }
            ];
            this.protectionLevelChoices = [
              { value: "GB", label: "全国重点文物保护单位" },
              { value: "SB", label: "省（自治区、直辖市）级文物保护单位" },
              { value: "XB", label: "市（县）级文物保护单位" },
              { value: "DS", label: "尚未定级的不可移动文物" }
            ];
            this.ownershipChoices = [
              { value: "state", label: "国有" },
              { value: "collective", label: "集体" },
              { value: "private", label: "私人" },
              { value: "other", label: "其他" }
            ];
            this.preservationStatusChoices = [
              { value: "好", label: "好" },
              { value: "较好", label: "较好" },
              { value: "一般", label: "一般" },
              { value: "较差", label: "较差" },
              { value: "差", label: "差" }
            ];
          }
        });
      },
      // ── 步骤切换（含验证） ────────────────────────────────
      goStep(target) {
        if (target === 1 && !this.validateStep0())
          return;
        if (target === 2 && !this.validateStep1())
          return;
        this.step = target;
        uni.pageScrollTo({ scrollTop: 0, duration: 100 });
      },
      validateStep0() {
        const e = {};
        if (!this.surveyCodeAuto && !this.cleanText(this.form.survey_code))
          e.survey_code = "请填写普查编号或切换为自动生成";
        if (!this.cleanText(this.form.name))
          e.name = "文物名称不能为空";
        if (!this.cleanText(this.form.era))
          e.era = "时代不能为空";
        if (!this.form.category)
          e.category = "请选择文物类别";
        this.errors = e;
        return Object.keys(e).length === 0;
      },
      validateStep1() {
        const e = {};
        if (!this.form.longitude || !this.form.latitude) {
          e.location = '请先点击"获取当前位置"以获取经纬度';
        }
        this.errors = e;
        return Object.keys(e).length === 0;
      },
      // ── GPS 定位 ──────────────────────────────────────────
      async getLocation() {
        this.locating = true;
        this.errors = {};
        try {
          const res = await new Promise((resolve, reject) => {
            uni.getLocation({
              type: "wgs84",
              isHighAccuracy: true,
              highAccuracyExpireTime: 15e3,
              success: (data) => resolve(data),
              fail: (err) => reject(err)
            });
          });
          this.form.longitude = Number(res.longitude).toFixed(8);
          this.form.latitude = Number(res.latitude).toFixed(8);
          this.locationAccuracy = res.accuracy != null ? Math.round(res.accuracy) : null;
          uni.showToast({ title: "GPS 定位成功", icon: "success", duration: 2e3 });
        } catch (err) {
          const errMsg = String((err == null ? void 0 : err.errMsg) || "").toLowerCase();
          let hint = "获取位置失败，请重试";
          if (errMsg.includes("auth denied") || errMsg.includes("denied") || errMsg.includes("permission")) {
            hint = "定位权限被拒绝，请在手机设置中开启";
          } else if (errMsg.includes("timeout")) {
            hint = "GPS 信号超时，请移至开阔区域重试";
          }
          this.errors = { location: hint };
          uni.showToast({ title: hint, icon: "none", duration: 3e3 });
        } finally {
          this.locating = false;
        }
      },
      // ── Picker 事件 ──────────────────────────────────────
      onCategoryChange(e) {
        this.form.category = this.categoryChoices[e.detail.value].value;
      },
      onProtectionChange(e) {
        this.form.protection_level = this.protectionLevelChoices[e.detail.value].value;
      },
      onOwnershipChange(e) {
        this.form.ownership = this.ownershipChoices[e.detail.value].value;
      },
      onPreservationChange(e) {
        this.form.preservation_status = this.preservationStatusChoices[e.detail.value].value;
      },
      // ── 照片选择 ─────────────────────────────────────────
      async choosePhoto() {
        const remaining = 10 - this.photos.length;
        uni.chooseImage({
          count: remaining,
          sizeType: ["compressed"],
          // 压缩图（减少流量）
          sourceType: ["camera", "album"],
          // 摄像头优先 + 相册
          success: async (res) => {
            const now = /* @__PURE__ */ new Date();
            const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
            const watermarkText = this.buildWatermarkText(time);
            for (const path of res.tempFilePaths) {
              try {
                const watermarkedPath = await addWatermark(path, watermarkText, this);
                this.photos.push({ path: watermarkedPath, status: "pending" });
              } catch (error) {
                this.photos.push({ path, status: "pending" });
              }
            }
          }
        });
      },
      removePhoto(idx) {
        this.photos.splice(idx, 1);
      },
      photoStatusText(status) {
        return { pending: "待上传", uploading: "上传中…", done: "✓ 完成", error: "✗ 失败" }[status] || "";
      },
      // ── 全流程提交 ───────────────────────────────────────
      async submitAll() {
        this.submitting = true;
        this.step = 4;
        this.progressMsg = "正在创建文物记录…";
        let heritageId = null;
        try {
          const result = await this.createHeritage();
          heritageId = result.heritage_id;
          this.generatedSurveyCode = result.survey_code || "";
        } catch (err) {
          this.progressMsg = `记录创建失败：${err}`;
          this.submitting = false;
          return;
        }
        let successCount = 0;
        for (let i = 0; i < this.photos.length; i++) {
          this.progressMsg = `正在上传第 ${i + 1} / ${this.photos.length} 张照片…`;
          this.photos[i].status = "uploading";
          try {
            await this.uploadPhoto(heritageId, this.photos[i].path, i === 0);
            this.photos[i].status = "done";
            successCount++;
          } catch {
            this.photos[i].status = "error";
          }
        }
        this.submitDone = true;
        this.submitting = false;
        const photoHint = this.photos.length > 0 ? `，成功上传 ${successCount}/${this.photos.length} 张照片` : "";
        this.progressMsg = `文物「${this.form.name}」已登记${photoHint}。`;
      },
      // 创建文物记录 → 返回 heritage_id (Promise)
      // 创建文物记录 → 返回 { heritage_id, survey_code } (Promise)
      createHeritage() {
        return new Promise((resolve, reject) => {
          uni.request({
            url: `${API$1}/api/collect/create`,
            method: "POST",
            header: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getToken()}`
            },
            data: {
              // 自动模式传空字符串，服务端自动生成；手动模式传用户填写值
              survey_code: this.surveyCodeAuto ? "" : this.cleanText(this.form.survey_code),
              name: this.cleanText(this.form.name),
              former_name: this.cleanText(this.form.former_name),
              era: this.cleanText(this.form.era),
              category: this.form.category,
              province: this.cleanText(this.form.province),
              city: this.cleanText(this.form.city),
              county: this.cleanText(this.form.county),
              township: this.cleanText(this.form.township),
              village: this.cleanText(this.form.village),
              address: this.cleanText(this.form.address),
              longitude: parseFloat(this.form.longitude),
              latitude: parseFloat(this.form.latitude),
              altitude: this.form.altitude ? parseFloat(this.form.altitude) : null,
              protection_level: this.form.protection_level,
              ownership: this.form.ownership,
              preservation_status: this.form.preservation_status,
              description: this.cleanText(this.form.description)
            },
            success: (res) => {
              var _a, _b;
              if (res.statusCode === 201) {
                resolve({ heritage_id: res.data.heritage_id, survey_code: res.data.survey_code });
              } else {
                const detail = ((_a = res.data) == null ? void 0 : _a.detail) || ((_b = res.data) == null ? void 0 : _b.message) || "未知错误";
                reject(detail);
              }
            },
            fail: (err) => reject(err.errMsg || "网络异常")
          });
        });
      },
      // 上传单张照片（含水印由服务端处理）→ Promise
      uploadPhoto(heritageId, filePath, isCover) {
        return new Promise((resolve, reject) => {
          uni.uploadFile({
            url: `${API$1}/api/collect/photos/${heritageId}`,
            filePath,
            name: "photo",
            formData: {
              photo_type: isCover ? "overview" : "detail",
              is_cover: isCover ? "true" : "false"
            },
            header: { Authorization: `Bearer ${getToken()}` },
            success: (res) => {
              try {
                const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
                if (res.statusCode === 201)
                  resolve(data);
                else
                  reject((data == null ? void 0 : data.detail) || "上传失败");
              } catch {
                if (res.statusCode === 201)
                  resolve({});
                else
                  reject("响应解析失败");
              }
            },
            fail: (err) => reject(err.errMsg || "网络异常")
          });
        });
      },
      // ── 重置表单（继续采集） ─────────────────────────────
      resetForm() {
        var _a;
        const keep = {
          province: this.form.province,
          city: this.form.city,
          county: this.form.county,
          protection_level: this.form.protection_level,
          ownership: this.form.ownership,
          preservation_status: this.form.preservation_status
        };
        this.form = Object.assign({
          survey_code: "",
          name: "",
          former_name: "",
          era: "",
          category: ((_a = this.categoryChoices[0]) == null ? void 0 : _a.value) || "",
          township: "",
          village: "",
          address: "",
          longitude: "",
          latitude: "",
          altitude: "",
          description: ""
        }, keep);
        this.photos = [];
        this.errors = {};
        this.step = 0;
        this.submitDone = false;
        this.progressMsg = "";
        this.generatedSurveyCode = "";
        this.locationAccuracy = null;
        this.surveyCodeAuto = true;
      },
      goMyRecords() {
        uni.navigateTo({ url: "/pages/collect/my_records" });
      }
    }
  };
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_AltitudeCollect = vue.resolveComponent("AltitudeCollect");
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createElementVNode("view", { class: "steps-bar" }, [
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($data.steps, (s, i) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              key: i,
              class: "step-item"
            }, [
              vue.createElementVNode(
                "view",
                {
                  class: vue.normalizeClass(["step-dot", $data.step > i ? "done" : $data.step === i ? "active" : ""])
                },
                [
                  $data.step > i ? (vue.openBlock(), vue.createElementBlock("text", {
                    key: 0,
                    class: "step-check"
                  }, "✓")) : (vue.openBlock(), vue.createElementBlock(
                    "text",
                    {
                      key: 1,
                      class: "step-num"
                    },
                    vue.toDisplayString(i + 1),
                    1
                    /* TEXT */
                  ))
                ],
                2
                /* CLASS */
              ),
              vue.createElementVNode(
                "text",
                {
                  class: vue.normalizeClass(["step-label", $data.step === i ? "step-label-active" : ""])
                },
                vue.toDisplayString(s),
                3
                /* TEXT, CLASS */
              ),
              i < $data.steps.length - 1 ? (vue.openBlock(), vue.createElementBlock(
                "view",
                {
                  key: 0,
                  class: vue.normalizeClass(["step-line", $data.step > i ? "done" : ""])
                },
                null,
                2
                /* CLASS */
              )) : vue.createCommentVNode("v-if", true)
            ]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ]),
      vue.createElementVNode("view", { class: "form-scroll" }, [
        $data.step === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "section"
        }, [
          vue.createElementVNode("view", { class: "section-head" }, [
            vue.createElementVNode("view", { class: "section-dot blue" }),
            vue.createElementVNode("text", { class: "section-title" }, "基础信息")
          ]),
          vue.createElementVNode("view", { class: "field" }, [
            vue.createElementVNode("view", { class: "code-label-row" }, [
              vue.createElementVNode("text", {
                class: "label",
                style: { "margin-bottom": "0" }
              }, "普查编号"),
              vue.createElementVNode("view", { class: "code-toggle-row" }, [
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["toggle-btn", $data.surveyCodeAuto ? "toggle-active" : ""]),
                    onClick: _cache[0] || (_cache[0] = ($event) => $data.surveyCodeAuto = true)
                  },
                  "自动生成",
                  2
                  /* CLASS */
                ),
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["toggle-btn", !$data.surveyCodeAuto ? "toggle-active" : ""]),
                    onClick: _cache[1] || (_cache[1] = ($event) => $data.surveyCodeAuto = false)
                  },
                  "手动填写",
                  2
                  /* CLASS */
                )
              ])
            ]),
            $data.surveyCodeAuto ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "code-auto-hint"
            }, [
              vue.createElementVNode("text", { class: "code-auto-icon" }, "🔖"),
              vue.createElementVNode("text", { class: "code-auto-text" }, "提交后由系统自动分配（格式：SS-CJ-YYYY-NNNN）")
            ])) : vue.createCommentVNode("v-if", true),
            !$data.surveyCodeAuto ? vue.withDirectives((vue.openBlock(), vue.createElementBlock(
              "input",
              {
                key: 1,
                "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.form.survey_code = $event),
                class: "input",
                placeholder: "如：SS-CJ-2026-0001",
                maxlength: "50"
              },
              null,
              512
              /* NEED_PATCH */
            )), [
              [vue.vModelText, $data.form.survey_code]
            ]) : vue.createCommentVNode("v-if", true),
            $data.errors.survey_code ? (vue.openBlock(), vue.createElementBlock(
              "text",
              {
                key: 2,
                class: "err"
              },
              vue.toDisplayString($data.errors.survey_code),
              1
              /* TEXT */
            )) : vue.createCommentVNode("v-if", true)
          ]),
          vue.createElementVNode("view", { class: "field" }, [
            vue.createElementVNode("text", { class: "label required" }, "文物名称"),
            vue.withDirectives(vue.createElementVNode(
              "input",
              {
                "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $data.form.name = $event),
                class: "input",
                placeholder: "请输入文物标准名称",
                maxlength: "200"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [vue.vModelText, $data.form.name]
            ]),
            $data.errors.name ? (vue.openBlock(), vue.createElementBlock(
              "text",
              {
                key: 0,
                class: "err"
              },
              vue.toDisplayString($data.errors.name),
              1
              /* TEXT */
            )) : vue.createCommentVNode("v-if", true)
          ]),
          vue.createElementVNode("view", { class: "field" }, [
            vue.createElementVNode("text", { class: "label" }, "曾用名 / 别名"),
            vue.withDirectives(vue.createElementVNode(
              "input",
              {
                "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $data.form.former_name = $event),
                class: "input",
                placeholder: "（选填）",
                maxlength: "200"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [vue.vModelText, $data.form.former_name]
            ])
          ]),
          vue.createElementVNode("view", { class: "field-row" }, [
            vue.createElementVNode("view", { class: "field half" }, [
              vue.createElementVNode("text", { class: "label required" }, "时代"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $data.form.era = $event),
                  class: "input",
                  placeholder: "如：汉、唐宋",
                  maxlength: "100"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $data.form.era]
              ]),
              $data.errors.era ? (vue.openBlock(), vue.createElementBlock(
                "text",
                {
                  key: 0,
                  class: "err"
                },
                vue.toDisplayString($data.errors.era),
                1
                /* TEXT */
              )) : vue.createCommentVNode("v-if", true)
            ]),
            vue.createElementVNode("view", { class: "field half" }, [
              vue.createElementVNode("text", { class: "label required" }, "文物类别"),
              vue.createElementVNode("picker", {
                range: $options.categoryLabels,
                value: $options.categoryIndex,
                onChange: _cache[6] || (_cache[6] = (...args) => $options.onCategoryChange && $options.onCategoryChange(...args))
              }, [
                vue.createElementVNode("view", { class: "picker-view" }, [
                  vue.createElementVNode(
                    "text",
                    {
                      class: vue.normalizeClass($data.form.category ? "picker-val" : "picker-ph")
                    },
                    vue.toDisplayString($data.form.category ? $options.categoryLabels[$options.categoryIndex] : "请选择"),
                    3
                    /* TEXT, CLASS */
                  ),
                  vue.createElementVNode("text", { class: "picker-arrow" }, "›")
                ])
              ], 40, ["range", "value"]),
              $data.errors.category ? (vue.openBlock(), vue.createElementBlock(
                "text",
                {
                  key: 0,
                  class: "err"
                },
                vue.toDisplayString($data.errors.category),
                1
                /* TEXT */
              )) : vue.createCommentVNode("v-if", true)
            ])
          ]),
          vue.createElementVNode("view", { class: "field" }, [
            vue.createElementVNode("text", { class: "label" }, "文物简介"),
            vue.withDirectives(vue.createElementVNode(
              "textarea",
              {
                "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => $data.form.description = $event),
                class: "textarea",
                placeholder: "对文物的历史背景、形制特征及现状进行描述",
                maxlength: "2000"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [vue.vModelText, $data.form.description]
            ])
          ]),
          vue.createElementVNode("button", {
            class: "btn-next",
            onClick: _cache[8] || (_cache[8] = ($event) => $options.goStep(1))
          }, "下一步：地理位置 →")
        ])) : vue.createCommentVNode("v-if", true),
        $data.step === 1 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "section"
        }, [
          vue.createElementVNode("view", { class: "section-head" }, [
            vue.createElementVNode("view", { class: "section-dot green" }),
            vue.createElementVNode("text", { class: "section-title" }, "地理位置")
          ]),
          vue.createElementVNode("view", { class: "gps-card" }, [
            vue.createElementVNode("view", { class: "gps-row" }, [
              vue.createElementVNode("button", {
                class: vue.normalizeClass(["btn-gps", $data.locating ? "loading" : ""]),
                onClick: _cache[9] || (_cache[9] = (...args) => $options.getLocation && $options.getLocation(...args)),
                disabled: $data.locating
              }, [
                vue.createElementVNode("text", { class: "gps-icon" }, "📍"),
                vue.createElementVNode(
                  "text",
                  null,
                  vue.toDisplayString($data.locating ? "定位中…" : $data.form.longitude ? "重新定位" : "获取当前位置"),
                  1
                  /* TEXT */
                )
              ], 10, ["disabled"]),
              vue.createElementVNode(
                "view",
                {
                  class: vue.normalizeClass(["gps-badge", $options.gpsBadgeClass])
                },
                vue.toDisplayString($options.gpsBadgeText),
                3
                /* TEXT, CLASS */
              )
            ]),
            $data.errors.location ? (vue.openBlock(), vue.createElementBlock(
              "text",
              {
                key: 0,
                class: "err",
                style: { "margin-top": "4rpx" }
              },
              vue.toDisplayString($data.errors.location),
              1
              /* TEXT */
            )) : vue.createCommentVNode("v-if", true),
            $data.form.longitude ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 1,
              class: "coord-display"
            }, [
              vue.createElementVNode("view", { class: "coord-item" }, [
                vue.createElementVNode("text", { class: "coord-label" }, "经度"),
                vue.createElementVNode(
                  "text",
                  { class: "coord-val" },
                  vue.toDisplayString($data.form.longitude),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "coord-item" }, [
                vue.createElementVNode("text", { class: "coord-label" }, "纬度"),
                vue.createElementVNode(
                  "text",
                  { class: "coord-val" },
                  vue.toDisplayString($data.form.latitude),
                  1
                  /* TEXT */
                )
              ]),
              $data.locationAccuracy ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "coord-item"
              }, [
                vue.createElementVNode("text", { class: "coord-label" }, "精度"),
                vue.createElementVNode(
                  "text",
                  { class: "coord-val" },
                  "±" + vue.toDisplayString($data.locationAccuracy) + "m",
                  1
                  /* TEXT */
                )
              ])) : vue.createCommentVNode("v-if", true),
              $data.form.altitude ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 1,
                class: "coord-item"
              }, [
                vue.createElementVNode("text", { class: "coord-label" }, "海拔"),
                vue.createElementVNode(
                  "text",
                  { class: "coord-val" },
                  vue.toDisplayString($data.form.altitude) + "m",
                  1
                  /* TEXT */
                )
              ])) : vue.createCommentVNode("v-if", true)
            ])) : vue.createCommentVNode("v-if", true)
          ]),
          vue.createElementVNode("view", { class: "field" }, [
            vue.createVNode(_component_AltitudeCollect, {
              modelValue: $data.form.altitude,
              "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => $data.form.altitude = $event),
              onCollectDone: $options.onAltitudeCollectDone
            }, null, 8, ["modelValue", "onCollectDone"])
          ]),
          vue.createElementVNode("view", { class: "field-row" }, [
            vue.createElementVNode("view", { class: "field third" }, [
              vue.createElementVNode("text", { class: "label" }, "省/自治区"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => $data.form.province = $event),
                  class: "input",
                  placeholder: "省级"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $data.form.province]
              ])
            ]),
            vue.createElementVNode("view", { class: "field third" }, [
              vue.createElementVNode("text", { class: "label" }, "市/州"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => $data.form.city = $event),
                  class: "input",
                  placeholder: "市级"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $data.form.city]
              ])
            ]),
            vue.createElementVNode("view", { class: "field third" }, [
              vue.createElementVNode("text", { class: "label" }, "县/区"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  "onUpdate:modelValue": _cache[13] || (_cache[13] = ($event) => $data.form.county = $event),
                  class: "input",
                  placeholder: "县级"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $data.form.county]
              ])
            ])
          ]),
          vue.createElementVNode("view", { class: "field-row" }, [
            vue.createElementVNode("view", { class: "field half" }, [
              vue.createElementVNode("text", { class: "label" }, "乡镇/街道"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  "onUpdate:modelValue": _cache[14] || (_cache[14] = ($event) => $data.form.township = $event),
                  class: "input",
                  placeholder: "（选填）"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $data.form.township]
              ])
            ]),
            vue.createElementVNode("view", { class: "field half" }, [
              vue.createElementVNode("text", { class: "label" }, "村/社区"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  "onUpdate:modelValue": _cache[15] || (_cache[15] = ($event) => $data.form.village = $event),
                  class: "input",
                  placeholder: "（选填）"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $data.form.village]
              ])
            ])
          ]),
          vue.createElementVNode("view", { class: "field" }, [
            vue.createElementVNode("text", { class: "label" }, "详细地址"),
            vue.withDirectives(vue.createElementVNode(
              "input",
              {
                "onUpdate:modelValue": _cache[16] || (_cache[16] = ($event) => $data.form.address = $event),
                class: "input",
                placeholder: "精确到自然地标或门牌号",
                maxlength: "500"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [vue.vModelText, $data.form.address]
            ])
          ]),
          vue.createElementVNode("view", { class: "btn-row" }, [
            vue.createElementVNode("button", {
              class: "btn-back",
              onClick: _cache[17] || (_cache[17] = ($event) => $data.step = 0)
            }, "← 上一步"),
            vue.createElementVNode("button", {
              class: "btn-next half",
              onClick: _cache[18] || (_cache[18] = ($event) => $options.goStep(2))
            }, "下一步：状态权属 →")
          ])
        ])) : vue.createCommentVNode("v-if", true),
        $data.step === 2 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 2,
          class: "section"
        }, [
          vue.createElementVNode("view", { class: "section-head" }, [
            vue.createElementVNode("view", { class: "section-dot amber" }),
            vue.createElementVNode("text", { class: "section-title" }, "保存状况与权属")
          ]),
          vue.createElementVNode("view", { class: "field-row" }, [
            vue.createElementVNode("view", { class: "field half" }, [
              vue.createElementVNode("text", { class: "label" }, "保存现状"),
              vue.createElementVNode("picker", {
                range: $options.preservationLabels,
                value: $options.preservationIndex,
                onChange: _cache[19] || (_cache[19] = (...args) => $options.onPreservationChange && $options.onPreservationChange(...args))
              }, [
                vue.createElementVNode("view", { class: "picker-view" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "picker-val" },
                    vue.toDisplayString($options.preservationLabels[$options.preservationIndex]),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("text", { class: "picker-arrow" }, "›")
                ])
              ], 40, ["range", "value"])
            ]),
            vue.createElementVNode("view", { class: "field half" }, [
              vue.createElementVNode("text", { class: "label" }, "权属"),
              vue.createElementVNode("picker", {
                range: $options.ownershipLabels,
                value: $options.ownershipIndex,
                onChange: _cache[20] || (_cache[20] = (...args) => $options.onOwnershipChange && $options.onOwnershipChange(...args))
              }, [
                vue.createElementVNode("view", { class: "picker-view" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "picker-val" },
                    vue.toDisplayString($options.ownershipLabels[$options.ownershipIndex]),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("text", { class: "picker-arrow" }, "›")
                ])
              ], 40, ["range", "value"])
            ])
          ]),
          vue.createElementVNode("view", { class: "field" }, [
            vue.createElementVNode("text", { class: "label" }, "保护级别"),
            vue.createElementVNode("picker", {
              range: $options.protectionLabels,
              value: $options.protectionIndex,
              onChange: _cache[21] || (_cache[21] = (...args) => $options.onProtectionChange && $options.onProtectionChange(...args))
            }, [
              vue.createElementVNode("view", { class: "picker-view" }, [
                vue.createElementVNode(
                  "text",
                  { class: "picker-val" },
                  vue.toDisplayString($options.protectionLabels[$options.protectionIndex]),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("text", { class: "picker-arrow" }, "›")
              ])
            ], 40, ["range", "value"])
          ]),
          vue.createElementVNode("view", { class: "btn-row" }, [
            vue.createElementVNode("button", {
              class: "btn-back",
              onClick: _cache[22] || (_cache[22] = ($event) => $data.step = 1)
            }, "← 上一步"),
            vue.createElementVNode("button", {
              class: "btn-next half",
              onClick: _cache[23] || (_cache[23] = ($event) => $options.goStep(3))
            }, "下一步：现场照片 →")
          ])
        ])) : vue.createCommentVNode("v-if", true),
        $data.step === 3 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 3,
          class: "section"
        }, [
          vue.createElementVNode("view", { class: "section-head" }, [
            vue.createElementVNode("view", { class: "section-dot rose" }),
            vue.createElementVNode("text", { class: "section-title" }, "现场照片"),
            vue.createElementVNode("text", { class: "section-hint" }, "最多 10 张，服务端自动加水印")
          ]),
          vue.createElementVNode("view", { class: "photo-grid" }, [
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($data.photos, (p, i) => {
                return vue.openBlock(), vue.createElementBlock("view", {
                  key: i,
                  class: "photo-thumb"
                }, [
                  vue.createElementVNode("image", {
                    src: p.path,
                    mode: "aspectFill",
                    class: "thumb-img"
                  }, null, 8, ["src"]),
                  i === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                    key: 0,
                    class: "cover-badge"
                  }, "封面")) : vue.createCommentVNode("v-if", true),
                  vue.createElementVNode("view", {
                    class: "remove-btn",
                    onClick: ($event) => $options.removePhoto(i)
                  }, "×", 8, ["onClick"])
                ]);
              }),
              128
              /* KEYED_FRAGMENT */
            )),
            $data.photos.length < 10 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "photo-add",
              onClick: _cache[24] || (_cache[24] = (...args) => $options.choosePhoto && $options.choosePhoto(...args))
            }, [
              vue.createElementVNode("text", { class: "add-icon" }, "📷"),
              vue.createElementVNode("text", { class: "add-text" }, "拍照/相册")
            ])) : vue.createCommentVNode("v-if", true)
          ]),
          vue.createElementVNode(
            "text",
            { class: "photo-count" },
            "已选 " + vue.toDisplayString($data.photos.length) + " 张",
            1
            /* TEXT */
          ),
          vue.createElementVNode("view", { class: "tip-box" }, [
            vue.createElementVNode("text", { class: "tip-text" }, "💡 第一张将作为封面图。选择照片后会先在 App 端按巡查上报同款样式合成水印："),
            vue.createElementVNode(
              "text",
              { class: "tip-text" },
              "文物名称 · 经纬度(度分秒) · 采集时间 · " + vue.toDisplayString($data.collectUnit),
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("view", { class: "btn-row" }, [
            vue.createElementVNode("button", {
              class: "btn-back",
              onClick: _cache[25] || (_cache[25] = ($event) => $data.step = 2)
            }, "← 上一步"),
            vue.createElementVNode("button", {
              class: "btn-next half",
              onClick: _cache[26] || (_cache[26] = (...args) => $options.submitAll && $options.submitAll(...args)),
              disabled: $data.submitting
            }, vue.toDisplayString($data.submitting ? "提交中…" : "提交采集数据 ✓"), 9, ["disabled"])
          ])
        ])) : vue.createCommentVNode("v-if", true),
        $data.step === 4 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 4,
          class: "section"
        }, [
          vue.createElementVNode("view", { class: "progress-card" }, [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["progress-icon", $data.submitDone ? "done" : "loading"])
              },
              [
                $data.submitDone ? (vue.openBlock(), vue.createElementBlock("text", { key: 0 }, "✓")) : (vue.openBlock(), vue.createElementBlock("text", {
                  key: 1,
                  class: "spin"
                }, "⟳"))
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "text",
              { class: "progress-title" },
              vue.toDisplayString($data.submitDone ? "采集成功！" : "正在提交…"),
              1
              /* TEXT */
            ),
            $data.submitDone && $data.generatedSurveyCode ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "survey-code-result"
            }, [
              vue.createElementVNode("text", { class: "survey-code-label" }, "采集编号"),
              vue.createElementVNode(
                "text",
                { class: "survey-code-value" },
                vue.toDisplayString($data.generatedSurveyCode),
                1
                /* TEXT */
              )
            ])) : vue.createCommentVNode("v-if", true),
            vue.createElementVNode(
              "text",
              { class: "progress-msg" },
              vue.toDisplayString($data.progressMsg),
              1
              /* TEXT */
            ),
            $data.photos.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 1,
              class: "photo-progress"
            }, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($data.photos, (p, i) => {
                  return vue.openBlock(), vue.createElementBlock("view", {
                    key: i,
                    class: "photo-progress-item"
                  }, [
                    vue.createElementVNode(
                      "view",
                      {
                        class: vue.normalizeClass(["progress-dot", p.status])
                      },
                      null,
                      2
                      /* CLASS */
                    ),
                    vue.createElementVNode(
                      "text",
                      { class: "progress-photo-name" },
                      "照片 " + vue.toDisplayString(i + 1),
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode(
                      "text",
                      { class: "progress-photo-status" },
                      vue.toDisplayString($options.photoStatusText(p.status)),
                      1
                      /* TEXT */
                    )
                  ]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])) : vue.createCommentVNode("v-if", true),
            $data.submitDone ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 2,
              class: "done-actions"
            }, [
              vue.createElementVNode("button", {
                class: "btn-back",
                onClick: _cache[27] || (_cache[27] = (...args) => $options.resetForm && $options.resetForm(...args))
              }, "继续采集"),
              vue.createElementVNode("button", {
                class: "btn-next half",
                onClick: _cache[28] || (_cache[28] = (...args) => $options.goMyRecords && $options.goMyRecords(...args))
              }, "查看我的采集")
            ])) : vue.createCommentVNode("v-if", true)
          ])
        ])) : vue.createCommentVNode("v-if", true)
      ]),
      vue.createElementVNode("canvas", {
        "canvas-id": "watermarkCanvas",
        width: $data.watermarkCanvas.width,
        height: $data.watermarkCanvas.height,
        style: vue.normalizeStyle(`position:absolute;left:-9999px;top:-9999px;width:${$data.watermarkCanvas.width}px;height:${$data.watermarkCanvas.height}px;pointer-events:none;`)
      }, null, 12, ["width", "height"])
    ]);
  }
  const PagesCollectCollect = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$1], ["__scopeId", "data-v-b24c290b"], ["__file", "C:/Users/14434/uniapp/pages/collect/collect.vue"]]);
  const API = config.API_BASE_URL;
  const PAGE_SIZE = 10;
  const _sfc_main$1 = {
    data() {
      return {
        records: [],
        total: 0,
        page: 1,
        hasMore: true,
        loading: false
      };
    },
    onLoad() {
      if (!getToken()) {
        uni.reLaunch({ url: "/pages/index/index" });
        return;
      }
      this.fetchRecords(1);
    },
    onPullDownRefresh() {
      this.fetchRecords(1, true).finally(() => uni.stopPullDownRefresh());
    },
    methods: {
      fetchRecords(page = 1, replace = false) {
        if (this.loading)
          return Promise.resolve();
        this.loading = true;
        return new Promise((resolve) => {
          uni.request({
            url: `${API}/api/collect/my-records`,
            data: { page, page_size: PAGE_SIZE },
            header: { Authorization: `Bearer ${getToken()}` },
            success: (res) => {
              if (res.statusCode === 200) {
                const items = res.data.items || [];
                const pagination = res.data.pagination || {};
                this.total = pagination.total || 0;
                this.hasMore = page < (pagination.total_pages || 1);
                this.page = page;
                if (replace) {
                  this.records = items;
                } else {
                  this.records = page === 1 ? items : [...this.records, ...items];
                }
              }
            },
            fail: () => {
              uni.showToast({ title: "加载失败，请稍后重试", icon: "none" });
            },
            complete: () => {
              this.loading = false;
              resolve();
            }
          });
        });
      },
      loadMore() {
        if (!this.loading && this.hasMore) {
          this.fetchRecords(this.page + 1);
        }
      },
      goCollect() {
        uni.navigateTo({ url: "/pages/collect/collect" });
      },
      exportDocx(item) {
        if (!item || !item.id)
          return;
        uni.showLoading({ title: "导出中…", mask: true });
        uni.downloadFile({
          url: `${API}/api/collect/export-docx/${item.id}`,
          header: { Authorization: `Bearer ${getToken()}` },
          success: (res) => {
            if (res.statusCode !== 200 || !res.tempFilePath) {
              uni.showToast({ title: "导出失败，请重试", icon: "none" });
              return;
            }
            uni.openDocument({
              filePath: res.tempFilePath,
              fileType: "docx",
              showMenu: true,
              fail: () => {
                uni.showToast({ title: "文件已下载，请在文件管理中查看", icon: "none" });
              }
            });
          },
          fail: () => {
            uni.showToast({ title: "网络异常，导出失败", icon: "none" });
          },
          complete: () => {
            uni.hideLoading();
          }
        });
      }
    }
  };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("text", { class: "header-title" }, "我的采集记录"),
        vue.createElementVNode(
          "text",
          { class: "header-count" },
          "共 " + vue.toDisplayString($data.total) + " 条",
          1
          /* TEXT */
        )
      ]),
      vue.createElementVNode(
        "scroll-view",
        {
          "scroll-y": "",
          class: "list-scroll",
          onScrolltolower: _cache[1] || (_cache[1] = (...args) => $options.loadMore && $options.loadMore(...args)),
          "lower-threshold": "100"
        },
        [
          $data.loading && !$data.records.length ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "loading-wrap"
          }, [
            vue.createElementVNode("text", { class: "loading-text" }, "加载中…")
          ])) : vue.createCommentVNode("v-if", true),
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($data.records, (item) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: item.id,
                class: "card"
              }, [
                vue.createElementVNode("view", { class: "card-left" }, [
                  item.cover_url ? (vue.openBlock(), vue.createElementBlock("image", {
                    key: 0,
                    src: item.cover_url,
                    mode: "aspectFill",
                    class: "thumb"
                  }, null, 8, ["src"])) : (vue.openBlock(), vue.createElementBlock("view", {
                    key: 1,
                    class: "thumb-placeholder"
                  }, [
                    vue.createElementVNode("text", { class: "thumb-icon" }, "🏛")
                  ]))
                ]),
                vue.createElementVNode("view", { class: "card-body" }, [
                  vue.createElementVNode("view", { class: "card-row" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "card-name" },
                      vue.toDisplayString(item.name),
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode(
                      "view",
                      { class: "level-badge" },
                      vue.toDisplayString(item.protection_level),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode(
                    "text",
                    { class: "card-code" },
                    "编号：" + vue.toDisplayString(item.survey_code),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { class: "card-meta" },
                    vue.toDisplayString(item.era) + " · " + vue.toDisplayString(item.category),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { class: "card-addr" },
                    vue.toDisplayString(item.address || "（地址未填）"),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("view", { class: "card-footer" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "card-time" },
                      vue.toDisplayString(item.collected_at),
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode(
                      "text",
                      { class: "card-photos" },
                      "📷 " + vue.toDisplayString(item.photo_count) + " 张",
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "card-actions" }, [
                    vue.createElementVNode("button", {
                      class: "btn-export",
                      onClick: ($event) => $options.exportDocx(item)
                    }, "导出 DOCX", 8, ["onClick"])
                  ])
                ])
              ]);
            }),
            128
            /* KEYED_FRAGMENT */
          )),
          !$data.loading && !$data.records.length ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "empty-tip"
          }, [
            vue.createElementVNode("text", { class: "empty-icon" }, "🗂"),
            vue.createElementVNode("text", { class: "empty-text" }, "暂无采集记录"),
            vue.createElementVNode("button", {
              class: "btn-go-collect",
              onClick: _cache[0] || (_cache[0] = (...args) => $options.goCollect && $options.goCollect(...args))
            }, "去采集")
          ])) : vue.createCommentVNode("v-if", true),
          $data.loading && $data.records.length ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 2,
            class: "load-more-tip"
          }, [
            vue.createElementVNode("text", null, "加载中…")
          ])) : vue.createCommentVNode("v-if", true),
          !$data.hasMore && $data.records.length ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 3,
            class: "load-more-tip"
          }, [
            vue.createElementVNode("text", null, "— 已显示全部 —")
          ])) : vue.createCommentVNode("v-if", true)
        ],
        32
        /* NEED_HYDRATION */
      ),
      vue.createElementVNode("view", {
        class: "fab",
        onClick: _cache[2] || (_cache[2] = (...args) => $options.goCollect && $options.goCollect(...args))
      }, [
        vue.createElementVNode("text", { class: "fab-icon" }, "＋")
      ])
    ]);
  }
  const PagesCollectMyRecords = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__scopeId", "data-v-7c21632e"], ["__file", "C:/Users/14434/uniapp/pages/collect/my_records.vue"]]);
  __definePage("pages/index/index", PagesIndexIndex);
  __definePage("pages/home/home", PagesHomeHome);
  __definePage("pages/patrol/patrol", PagesPatrolPatrol);
  __definePage("pages/records/records", PagesRecordsRecords);
  __definePage("pages/my/my", PagesMyMy);
  __definePage("pages/about/about", PagesAboutAbout);
  __definePage("pages/admin/admin", PagesAdminAdmin);
  __definePage("pages/kml/kml", PagesKmlKml);
  __definePage("pages/collect/collect", PagesCollectCollect);
  __definePage("pages/collect/my_records", PagesCollectMyRecords);
  const _sfc_main = {
    onLaunch: function() {
      formatAppLog("log", "at App.vue:4", "App Launch");
    },
    onShow: function() {
      formatAppLog("log", "at App.vue:7", "App Show");
    },
    onHide: function() {
      formatAppLog("log", "at App.vue:10", "App Hide");
    }
  };
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "C:/Users/14434/uniapp/App.vue"]]);
  function createApp() {
    const app = vue.createVueApp(App);
    return {
      app
    };
  }
  const { app: __app__, Vuex: __Vuex__, Pinia: __Pinia__ } = createApp();
  uni.Vuex = __Vuex__;
  uni.Pinia = __Pinia__;
  __app__.provide("__globalStyles", __uniConfig.styles);
  __app__._component.mpType = "app";
  __app__._component.render = () => {
  };
  __app__.mount("#app");
})(Vue);
