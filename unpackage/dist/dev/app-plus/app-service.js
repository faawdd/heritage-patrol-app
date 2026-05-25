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
  const _sfc_main$d = {
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
  function _sfc_render$c(_ctx, _cache, $props, $setup, $data, $options) {
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
  const PagesIndexIndex = /* @__PURE__ */ _export_sfc(_sfc_main$d, [["render", _sfc_render$c], ["__file", "C:/Users/14434/uniapp/pages/index/index.vue"]]);
  const _sfc_main$c = {
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
  function _sfc_render$b(_ctx, _cache, $props, $setup, $data, $options) {
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
  const BottomNav = /* @__PURE__ */ _export_sfc(_sfc_main$c, [["render", _sfc_render$b], ["__scopeId", "data-v-53d1cde7"], ["__file", "C:/Users/14434/uniapp/components/BottomNav.vue"]]);
  const featureDefinitions = [
    { key: "patrol", labelKey: "home.featurePatrol", icon: "巡", url: "/pages/patrol/patrol" },
    { key: "records", labelKey: "home.featureRecords", icon: "记", url: "/pages/records/records" },
    { key: "heritages", labelKey: "home.featureHeritages", icon: "文", url: "/pages/admin/admin" },
    { key: "collectManage", labelKey: "home.featureCollectManage", icon: "采", url: "/pages/collect/my_records" },
    { key: "projects", labelKey: "home.featureProjects", icon: "项", url: "/pages/admin/admin?tab=projects" },
    { key: "kml", labelKey: "home.featureKml", icon: "图", url: "/pages/kml/kml" },
    { key: "my", labelKey: "home.featureMy", icon: "我", url: "/pages/my/my" }
  ];
  const _sfc_main$b = {
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
  function _sfc_render$a(_ctx, _cache, $props, $setup, $data, $options) {
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
  const PagesHomeHome = /* @__PURE__ */ _export_sfc(_sfc_main$b, [["render", _sfc_render$a], ["__file", "C:/Users/14434/uniapp/pages/home/home.vue"]]);
  const ON_LOAD = "onLoad";
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  const createLifeCycleHook = (lifecycle, flag = 0) => (hook, target = vue.getCurrentInstance()) => {
    !vue.isInSSRComponentSetup && vue.injectHook(lifecycle, hook, target);
  };
  const onLoad = /* @__PURE__ */ createLifeCycleHook(
    ON_LOAD,
    2
    /* HookFlags.PAGE */
  );
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
  const _sfc_main$a = {
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
  function _sfc_render$9(_ctx, _cache, $props, $setup, $data, $options) {
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
  const PagesPatrolPatrol = /* @__PURE__ */ _export_sfc(_sfc_main$a, [["render", _sfc_render$9], ["__file", "C:/Users/14434/uniapp/pages/patrol/patrol.vue"]]);
  const _sfc_main$9 = {
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
  function _sfc_render$8(_ctx, _cache, $props, $setup, $data, $options) {
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
  const PagesRecordsRecords = /* @__PURE__ */ _export_sfc(_sfc_main$9, [["render", _sfc_render$8], ["__file", "C:/Users/14434/uniapp/pages/records/records.vue"]]);
  const _sfc_main$8 = {
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
  function _sfc_render$7(_ctx, _cache, $props, $setup, $data, $options) {
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
  const PagesMyMy = /* @__PURE__ */ _export_sfc(_sfc_main$8, [["render", _sfc_render$7], ["__file", "C:/Users/14434/uniapp/pages/my/my.vue"]]);
  const _sfc_main$7 = {
    mixins: [createPageI18n("about")]
  };
  function _sfc_render$6(_ctx, _cache, $props, $setup, $data, $options) {
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
  const PagesAboutAbout = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["render", _sfc_render$6], ["__file", "C:/Users/14434/uniapp/pages/about/about.vue"]]);
  const workflowValues = [
    "received",
    "ovital_checked",
    "site_surveyed",
    "application_submitted",
    "bureau_approved",
    "replied_to_project",
    "archived"
  ];
  const _sfc_main$6 = {
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
  function _sfc_render$5(_ctx, _cache, $props, $setup, $data, $options) {
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
  const PagesAdminAdmin = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["render", _sfc_render$5], ["__file", "C:/Users/14434/uniapp/pages/admin/admin.vue"]]);
  const _sfc_main$5 = {
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
  function _sfc_render$4(_ctx, _cache, $props, $setup, $data, $options) {
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
  const PagesKmlKml = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["render", _sfc_render$4], ["__file", "C:/Users/14434/uniapp/pages/kml/kml.vue"]]);
  const CHINA_REGION_TREE = [
    { name: "北京市", cities: [{ name: "北京市", counties: ["东城区", "西城区", "朝阳区", "海淀区", "丰台区", "石景山区", "通州区", "顺义区", "昌平区", "大兴区"] }] },
    { name: "天津市", cities: [{ name: "天津市", counties: ["和平区", "河东区", "河西区", "南开区", "河北区", "红桥区", "东丽区", "西青区", "津南区", "北辰区"] }] },
    { name: "河北省", cities: [{ name: "石家庄市", counties: ["长安区", "桥西区", "新华区", "裕华区"] }, { name: "唐山市", counties: ["路南区", "路北区", "丰南区", "丰润区"] }] },
    { name: "山西省", cities: [{ name: "太原市", counties: ["小店区", "迎泽区", "杏花岭区", "尖草坪区"] }] },
    { name: "内蒙古自治区", cities: [{ name: "呼和浩特市", counties: ["新城区", "回民区", "玉泉区", "赛罕区"] }] },
    { name: "辽宁省", cities: [{ name: "沈阳市", counties: ["和平区", "沈河区", "皇姑区", "铁西区"] }] },
    { name: "吉林省", cities: [{ name: "长春市", counties: ["南关区", "宽城区", "朝阳区", "二道区"] }] },
    { name: "黑龙江省", cities: [{ name: "哈尔滨市", counties: ["道里区", "南岗区", "道外区", "香坊区"] }] },
    { name: "上海市", cities: [{ name: "上海市", counties: ["黄浦区", "徐汇区", "长宁区", "静安区", "浦东新区", "闵行区"] }] },
    { name: "江苏省", cities: [{ name: "南京市", counties: ["玄武区", "秦淮区", "建邺区", "鼓楼区"] }, { name: "苏州市", counties: ["姑苏区", "吴中区", "相城区", "工业园区"] }] },
    { name: "浙江省", cities: [{ name: "杭州市", counties: ["上城区", "拱墅区", "西湖区", "滨江区"] }, { name: "宁波市", counties: ["海曙区", "江北区", "鄞州区"] }] },
    { name: "安徽省", cities: [{ name: "合肥市", counties: ["瑶海区", "庐阳区", "蜀山区", "包河区"] }] },
    { name: "福建省", cities: [{ name: "福州市", counties: ["鼓楼区", "台江区", "仓山区", "晋安区"] }, { name: "厦门市", counties: ["思明区", "湖里区", "集美区"] }] },
    { name: "江西省", cities: [{ name: "南昌市", counties: ["东湖区", "西湖区", "青云谱区", "青山湖区"] }] },
    { name: "山东省", cities: [{ name: "济南市", counties: ["历下区", "市中区", "槐荫区", "历城区"] }, { name: "青岛市", counties: ["市南区", "市北区", "崂山区", "黄岛区"] }] },
    { name: "河南省", cities: [{ name: "郑州市", counties: ["中原区", "二七区", "金水区", "惠济区"] }] },
    { name: "湖北省", cities: [{ name: "武汉市", counties: ["江岸区", "江汉区", "武昌区", "洪山区"] }] },
    { name: "湖南省", cities: [{ name: "长沙市", counties: ["芙蓉区", "天心区", "岳麓区", "雨花区"] }] },
    { name: "广东省", cities: [{ name: "广州市", counties: ["越秀区", "海珠区", "天河区", "白云区"] }, { name: "深圳市", counties: ["福田区", "罗湖区", "南山区", "宝安区"] }] },
    { name: "广西壮族自治区", cities: [{ name: "南宁市", counties: ["兴宁区", "青秀区", "江南区", "西乡塘区"] }] },
    { name: "海南省", cities: [{ name: "海口市", counties: ["秀英区", "龙华区", "琼山区", "美兰区"] }, { name: "三亚市", counties: ["海棠区", "吉阳区", "天涯区", "崖州区"] }] },
    { name: "重庆市", cities: [{ name: "重庆市", counties: ["渝中区", "江北区", "南岸区", "九龙坡区", "沙坪坝区", "渝北区"] }] },
    { name: "四川省", cities: [{ name: "成都市", counties: ["锦江区", "青羊区", "金牛区", "武侯区", "成华区"] }] },
    { name: "贵州省", cities: [{ name: "贵阳市", counties: ["南明区", "云岩区", "花溪区", "观山湖区"] }] },
    { name: "云南省", cities: [{ name: "昆明市", counties: ["五华区", "盘龙区", "官渡区", "西山区"] }] },
    { name: "西藏自治区", cities: [{ name: "拉萨市", counties: ["城关区", "堆龙德庆区", "达孜区", "林周县"] }] },
    {
      name: "新疆维吾尔自治区",
      cities: [
        { name: "乌鲁木齐市", counties: ["天山区", "沙依巴克区", "新市区", "水磨沟区"] },
        { name: "吐鲁番市", counties: ["高昌区", "鄯善县", "托克逊县"] },
        { name: "哈密市", counties: ["伊州区", "巴里坤哈萨克自治县", "伊吾县"] }
      ]
    },
    { name: "陕西省", cities: [{ name: "西安市", counties: ["新城区", "碑林区", "莲湖区", "雁塔区"] }] },
    { name: "甘肃省", cities: [{ name: "兰州市", counties: ["城关区", "七里河区", "西固区", "安宁区"] }] },
    { name: "青海省", cities: [{ name: "西宁市", counties: ["城东区", "城中区", "城西区", "城北区"] }] },
    { name: "宁夏回族自治区", cities: [{ name: "银川市", counties: ["兴庆区", "金凤区", "西夏区", "永宁县"] }] },
    { name: "香港特别行政区", cities: [{ name: "香港特别行政区", counties: ["中西区", "湾仔区", "东区", "南区"] }] },
    { name: "澳门特别行政区", cities: [{ name: "澳门特别行政区", counties: ["花地玛堂区", "圣安多尼堂区", "大堂区", "望德堂区"] }] },
    { name: "台湾省", cities: [{ name: "台北市", counties: ["中正区", "大同区", "中山区", "松山区", "大安区"] }] }
  ];
  const DEFAULT_REGION = {
    province: "新疆维吾尔自治区",
    city: "吐鲁番市",
    county: "鄯善县"
  };
  const _sfc_main$4 = {
    __name: "CoordinateCollectCard",
    props: {
      modelValue: {
        type: Array,
        default: () => []
      },
      heritageName: {
        type: String,
        default: ""
      },
      capturePointData: {
        type: Function,
        default: null
      }
    },
    emits: ["update:modelValue"],
    setup(__props, { expose: __expose, emit: __emit }) {
      const props = __props;
      const emit = __emit;
      const typeLabelByValue = {
        boundary: "边界点",
        marker: "标志点",
        other: "其他"
      };
      const typeValueByLabel = {
        边界点: "boundary",
        标志点: "marker",
        其他: "other"
      };
      const typeLabelList = ["边界点", "标志点", "其他"];
      const coordList = vue.reactive([]);
      const loadingMap = vue.reactive({});
      const pointWindowVisible = vue.ref(false);
      const activePointId = vue.ref("");
      const pointThemes = [
        { bg: "#FFFBE6", border: "#FFE58F" },
        { bg: "#F6FFED", border: "#B7EB8F" },
        { bg: "#E6F7FF", border: "#91D5FF" },
        { bg: "#F9F0FF", border: "#D3ADF7" },
        { bg: "#FFF1F0", border: "#FFA39E" },
        { bg: "#FCFFE6", border: "#D3F261" }
      ];
      let uidSeed = 0;
      function nextId() {
        uidSeed += 1;
        return `coord_${Date.now()}_${uidSeed}`;
      }
      function buildBoundaryDefaultDescription() {
        const name = String(props.heritageName || "").trim();
        if (name)
          return `${name}边界点`;
        return "该文物点边界点";
      }
      function normalizePoint(raw) {
        const type = (raw == null ? void 0 : raw.type) && typeLabelByValue[raw.type] ? raw.type : "boundary";
        return {
          id: (raw == null ? void 0 : raw.id) || nextId(),
          type,
          longitude: (raw == null ? void 0 : raw.longitude) != null ? String(raw.longitude) : "",
          latitude: (raw == null ? void 0 : raw.latitude) != null ? String(raw.latitude) : "",
          altitude: (raw == null ? void 0 : raw.altitude) != null ? String(raw.altitude) : "",
          sourceTag: (raw == null ? void 0 : raw.sourceTag) != null ? String(raw.sourceTag) : "",
          description: (raw == null ? void 0 : raw.description) || (type === "boundary" ? buildBoundaryDefaultDescription() : ""),
          remark: (raw == null ? void 0 : raw.remark) || "",
          // 内部标记：description 是否由系统自动填充，便于切换类型时安全覆盖。
          _descriptionAuto: (raw == null ? void 0 : raw._descriptionAuto) !== void 0 ? !!raw._descriptionAuto : type === "boundary"
        };
      }
      function syncFromModelValue() {
        coordList.splice(0, coordList.length, ...(props.modelValue || []).map((item) => normalizePoint(item)));
      }
      vue.watch(
        () => props.modelValue,
        () => {
          syncFromModelValue();
        },
        { immediate: true, deep: true }
      );
      vue.watch(
        () => props.heritageName,
        () => {
          coordList.forEach((item) => {
            if (item.type === "boundary" && item._descriptionAuto) {
              item.description = buildBoundaryDefaultDescription();
            }
          });
          emitModel();
        }
      );
      function emitModel() {
        const payload = coordList.map((item) => ({
          type: item.type,
          longitude: item.longitude,
          latitude: item.latitude,
          altitude: item.altitude,
          sourceTag: item.sourceTag,
          description: item.description,
          remark: item.remark
        }));
        emit("update:modelValue", payload);
      }
      function pointThemeStyle(index) {
        const theme = pointThemes[index % pointThemes.length];
        return {
          background: theme.bg,
          borderColor: theme.border
        };
      }
      const activePointIndex = vue.computed(() => {
        return coordList.findIndex((item) => item.id === activePointId.value);
      });
      const activePoint = vue.computed(() => {
        if (activePointIndex.value < 0)
          return null;
        return coordList[activePointIndex.value] || null;
      });
      function openPointWindow(pointId) {
        activePointId.value = pointId;
        pointWindowVisible.value = true;
      }
      function closePointWindow() {
        pointWindowVisible.value = false;
      }
      function addPoint() {
        const point = normalizePoint({
          type: "boundary",
          description: buildBoundaryDefaultDescription(),
          _descriptionAuto: true
        });
        coordList.push(point);
        emitModel();
        openPointWindow(point.id);
      }
      function removePoint(index) {
        const removed = coordList[index];
        coordList.splice(index, 1);
        if (removed && removed.id === activePointId.value) {
          closePointWindow();
          activePointId.value = "";
        }
        emitModel();
      }
      function onTypeChange(event, item) {
        var _a;
        const idx = Number(((_a = event == null ? void 0 : event.detail) == null ? void 0 : _a.value) || 0);
        const label = typeLabelList[idx] || "边界点";
        const newType = typeValueByLabel[label] || "boundary";
        const oldType = item.type;
        item.type = newType;
        if (newType === "boundary") {
          const current = String(item.description || "").trim();
          const oldAutoText = buildBoundaryDefaultDescription();
          if (!current || item._descriptionAuto || oldType !== "boundary" || current === oldAutoText) {
            item.description = buildBoundaryDefaultDescription();
            item._descriptionAuto = true;
          }
        } else if (item._descriptionAuto) {
          item.description = "";
          item._descriptionAuto = false;
        }
        emitModel();
      }
      function onFieldInput(event, item, fieldName) {
        var _a;
        item[fieldName] = ((_a = event == null ? void 0 : event.detail) == null ? void 0 : _a.value) ?? "";
        emitModel();
      }
      function onDescriptionInput(event, item) {
        var _a;
        item.description = ((_a = event == null ? void 0 : event.detail) == null ? void 0 : _a.value) ?? "";
        item._descriptionAuto = false;
        emitModel();
      }
      function getTypePickerIndex(typeValue) {
        const label = typeLabelByValue[typeValue] || "边界点";
        const idx = typeLabelList.findIndex((x) => x === label);
        return idx >= 0 ? idx : 0;
      }
      function setLoading(pointId, field, loading) {
        if (!loadingMap[pointId])
          loadingMap[pointId] = {};
        loadingMap[pointId][field] = loading;
      }
      function isPointLoading(pointId) {
        var _a;
        return !!((_a = loadingMap[pointId]) == null ? void 0 : _a.all);
      }
      async function grabPoint(item) {
        if (typeof props.capturePointData !== "function") {
          uni.showToast({ title: "未配置定位抓取逻辑", icon: "none" });
          return;
        }
        try {
          setLoading(item.id, "all", true);
          const result = await props.capturePointData(item);
          if (!result || typeof result !== "object") {
            uni.showToast({ title: "抓取失败，请重试", icon: "none" });
            return;
          }
          if (Number.isFinite(Number(result.longitude))) {
            item.longitude = Number(result.longitude).toFixed(6);
          }
          if (Number.isFinite(Number(result.latitude))) {
            item.latitude = Number(result.latitude).toFixed(6);
          }
          if (Number.isFinite(Number(result.altitude))) {
            item.altitude = Number(result.altitude).toFixed(2);
          }
          if (result.sourceTag != null) {
            item.sourceTag = String(result.sourceTag);
          }
          emitModel();
          uni.showToast({ title: "当前点位抓取成功", icon: "none" });
        } catch (error) {
          uni.showToast({ title: "定位抓取失败", icon: "none" });
        } finally {
          setLoading(item.id, "all", false);
        }
      }
      const boundaryCount = vue.computed(() => coordList.filter((item) => item.type === "boundary").length);
      function validateBeforeSubmit() {
        if (boundaryCount.value < 3) {
          return {
            ok: false,
            message: "边界点至少需要 3 个，无法提交。"
          };
        }
        return { ok: true, message: "" };
      }
      function getCoordPayload() {
        return coordList.map((item) => ({
          type: item.type,
          longitude: item.longitude,
          latitude: item.latitude,
          altitude: item.altitude,
          sourceTag: item.sourceTag,
          description: item.description,
          remark: item.remark
        }));
      }
      __expose({
        validateBeforeSubmit,
        getCoordPayload,
        addPoint,
        coordList
      });
      const __returned__ = { props, emit, typeLabelByValue, typeValueByLabel, typeLabelList, coordList, loadingMap, pointWindowVisible, activePointId, pointThemes, get uidSeed() {
        return uidSeed;
      }, set uidSeed(v) {
        uidSeed = v;
      }, nextId, buildBoundaryDefaultDescription, normalizePoint, syncFromModelValue, emitModel, pointThemeStyle, activePointIndex, activePoint, openPointWindow, closePointWindow, addPoint, removePoint, onTypeChange, onFieldInput, onDescriptionInput, getTypePickerIndex, setLoading, isPointLoading, grabPoint, boundaryCount, validateBeforeSubmit, getCoordPayload, computed: vue.computed, reactive: vue.reactive, ref: vue.ref, watch: vue.watch };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "coord-card" }, [
      vue.createElementVNode("view", { class: "card-head" }, [
        vue.createElementVNode("text", { class: "card-title" }, "区块2：坐标采集"),
        vue.createElementVNode("text", { class: "card-subtitle" }, "边界点至少 3 个；标志点/其他为可选")
      ]),
      vue.createElementVNode("view", { class: "head-actions" }, [
        vue.createElementVNode("button", {
          class: "btn-add",
          onClick: $setup.addPoint
        }, "新增定位点")
      ]),
      $setup.coordList.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "empty-wrap"
      }, [
        vue.createElementVNode("text", { class: "empty-text" }, "暂无坐标点，请点击“新增定位点”")
      ])) : vue.createCommentVNode("v-if", true),
      (vue.openBlock(true), vue.createElementBlock(
        vue.Fragment,
        null,
        vue.renderList($setup.coordList, (item, index) => {
          return vue.openBlock(), vue.createElementBlock(
            "view",
            {
              key: item.id,
              class: "point-brief",
              style: vue.normalizeStyle($setup.pointThemeStyle(index))
            },
            [
              vue.createElementVNode("view", { class: "brief-head" }, [
                vue.createElementVNode(
                  "text",
                  { class: "brief-title" },
                  "定位点 " + vue.toDisplayString(index + 1),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "brief-type" },
                  vue.toDisplayString($setup.typeLabelByValue[item.type]),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "brief-body" }, [
                vue.createElementVNode(
                  "text",
                  { class: "brief-row" },
                  "经度：" + vue.toDisplayString(item.longitude || "未填"),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "brief-row" },
                  "纬度：" + vue.toDisplayString(item.latitude || "未填"),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "brief-row" },
                  "海拔：" + vue.toDisplayString(item.altitude || "未填"),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "brief-actions" }, [
                vue.createElementVNode("button", {
                  class: "btn-open",
                  onClick: ($event) => $setup.openPointWindow(item.id)
                }, "打开坐标窗口", 8, ["onClick"]),
                vue.createElementVNode("button", {
                  class: "btn-delete",
                  onClick: ($event) => $setup.removePoint(index)
                }, "删除", 8, ["onClick"])
              ])
            ],
            4
            /* STYLE */
          );
        }),
        128
        /* KEYED_FRAGMENT */
      )),
      $setup.pointWindowVisible && $setup.activePoint ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 1,
        class: "point-overlay",
        onClick: vue.withModifiers($setup.closePointWindow, ["self"])
      }, [
        vue.createElementVNode(
          "view",
          {
            class: "point-window",
            style: vue.normalizeStyle($setup.pointThemeStyle($setup.activePointIndex))
          },
          [
            vue.createElementVNode("view", { class: "window-head" }, [
              vue.createElementVNode(
                "text",
                { class: "window-title" },
                "定位点 " + vue.toDisplayString($setup.activePointIndex + 1) + " 坐标窗口",
                1
                /* TEXT */
              ),
              vue.createElementVNode("button", {
                class: "btn-close",
                onClick: $setup.closePointWindow
              }, "关闭")
            ]),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("text", { class: "row-label required" }, "坐标类型"),
              vue.createElementVNode("picker", {
                class: "row-right",
                range: $setup.typeLabelList,
                value: $setup.getTypePickerIndex($setup.activePoint.type),
                onChange: _cache[0] || (_cache[0] = ($event) => $setup.onTypeChange($event, $setup.activePoint))
              }, [
                vue.createElementVNode(
                  "view",
                  { class: "picker-value" },
                  vue.toDisplayString($setup.typeLabelByValue[$setup.activePoint.type]),
                  1
                  /* TEXT */
                )
              ], 40, ["value"])
            ]),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("text", { class: "row-label required" }, "经度"),
              vue.createElementVNode("view", { class: "row-right" }, [
                vue.createElementVNode("input", {
                  class: "row-input",
                  type: "digit",
                  value: $setup.activePoint.longitude,
                  placeholder: "自动抓取或手动填写",
                  onInput: _cache[1] || (_cache[1] = ($event) => $setup.onFieldInput($event, $setup.activePoint, "longitude"))
                }, null, 40, ["value"])
              ])
            ]),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("text", { class: "row-label required" }, "纬度"),
              vue.createElementVNode("view", { class: "row-right" }, [
                vue.createElementVNode("input", {
                  class: "row-input",
                  type: "digit",
                  value: $setup.activePoint.latitude,
                  placeholder: "自动抓取或手动填写",
                  onInput: _cache[2] || (_cache[2] = ($event) => $setup.onFieldInput($event, $setup.activePoint, "latitude"))
                }, null, 40, ["value"])
              ])
            ]),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("text", { class: "row-label required" }, "海拔(米)"),
              vue.createElementVNode("view", { class: "row-right" }, [
                vue.createElementVNode("input", {
                  class: "row-input",
                  type: "digit",
                  value: $setup.activePoint.altitude,
                  placeholder: "自动抓取或手动填写",
                  onInput: _cache[3] || (_cache[3] = ($event) => $setup.onFieldInput($event, $setup.activePoint, "altitude"))
                }, null, 40, ["value"])
              ])
            ]),
            $setup.activePoint.sourceTag ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "form-row"
            }, [
              vue.createElementVNode("text", { class: "row-label" }, "高程来源"),
              vue.createElementVNode("view", { class: "row-right source-tag-wrap" }, [
                vue.createElementVNode(
                  "text",
                  { class: "source-tag-text" },
                  vue.toDisplayString($setup.activePoint.sourceTag),
                  1
                  /* TEXT */
                )
              ])
            ])) : vue.createCommentVNode("v-if", true),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("text", { class: "row-label required" }, "点位说明"),
              vue.createElementVNode("input", {
                class: "row-right row-input",
                value: $setup.activePoint.description,
                maxlength: "200",
                placeholder: "请输入坐标点说明",
                onInput: _cache[4] || (_cache[4] = ($event) => $setup.onDescriptionInput($event, $setup.activePoint))
              }, null, 40, ["value"])
            ]),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("text", { class: "row-label" }, "备注"),
              vue.createElementVNode("input", {
                class: "row-right row-input",
                value: $setup.activePoint.remark,
                maxlength: "200",
                placeholder: "选填",
                onInput: _cache[5] || (_cache[5] = ($event) => $setup.onFieldInput($event, $setup.activePoint, "remark"))
              }, null, 40, ["value"])
            ]),
            vue.createElementVNode("view", { class: "window-actions" }, [
              vue.createElementVNode("button", {
                class: "btn-grab",
                disabled: $setup.isPointLoading($setup.activePoint.id),
                onClick: _cache[6] || (_cache[6] = ($event) => $setup.grabPoint($setup.activePoint))
              }, vue.toDisplayString($setup.isPointLoading($setup.activePoint.id) ? "定位中" : "实时定位"), 9, ["disabled"]),
              vue.createElementVNode("button", {
                class: "btn-finish",
                onClick: $setup.closePointWindow
              }, "完成当前点位")
            ])
          ],
          4
          /* STYLE */
        )
      ])) : vue.createCommentVNode("v-if", true),
      vue.createElementVNode("view", { class: "footer-tip" }, [
        vue.createElementVNode(
          "text",
          { class: "tip-text" },
          "边界点数量：" + vue.toDisplayString($setup.boundaryCount) + " 个",
          1
          /* TEXT */
        ),
        $setup.boundaryCount < 3 ? (vue.openBlock(), vue.createElementBlock("text", {
          key: 0,
          class: "tip-warn"
        }, "提交前至少补齐 3 个边界点")) : vue.createCommentVNode("v-if", true)
      ])
    ]);
  }
  const CoordinateCollectCard = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["render", _sfc_render$3], ["__scopeId", "data-v-80f12d19"], ["__file", "C:/Users/14434/uniapp/components/CoordinateCollectCard.vue"]]);
  const DEM_TIMEOUT_MS = 15e3;
  const ALTITUDE_MIN_M = -500;
  const ALTITUDE_MAX_M = 9e3;
  const ALTITUDE_ZERO_EPS = 0.01;
  const GPS_TIMEOUT_MS = 12e3;
  const _sfc_main$3 = {
    __name: "HeritageCollectRefactor",
    props: {
      loading: {
        type: Boolean,
        default: false
      },
      meta: {
        type: Object,
        default: () => ({
          categoryChoices: [],
          protectionLevelChoices: [],
          ownershipChoices: [],
          preservationStatusChoices: []
        })
      }
    },
    emits: ["submit"],
    setup(__props, { expose: __expose, emit: __emit }) {
      const props = __props;
      const emitting = __emit;
      const currentStep = vue.ref(0);
      const stepDefs = [
        { key: "step1", label: "第一步：基础地理" },
        { key: "step2", label: "第二步：多点坐标" },
        { key: "step3", label: "第三步：多媒体/审核" }
      ];
      function stepNodeClass(idx) {
        if (currentStep.value === idx)
          return "active";
        if (currentStep.value > idx)
          return "done";
        return "pending";
      }
      const altitudeMode = vue.ref("dem");
      const photos = vue.ref([]);
      const signStatus = vue.ref("");
      const watermarkCanvas = vue.reactive({ width: 1, height: 1 });
      const coordRef = vue.ref(null);
      const coordList = vue.ref([]);
      const instance = vue.getCurrentInstance();
      if (instance && instance.proxy) {
        instance.proxy.watermarkCanvas = watermarkCanvas;
      }
      const form = vue.reactive({
        surveyCodeAuto: true,
        name: "",
        former_name: "",
        code: "",
        era: "",
        category: "",
        longitude: "",
        latitude: "",
        altitude: "",
        province: "",
        city: "",
        county: "",
        township: "",
        village: "",
        address: "",
        protection_level: "",
        ownership: "",
        preservation_status: "",
        remark: ""
      });
      vue.watch(
        () => props.meta,
        (meta) => {
          const c = (meta == null ? void 0 : meta.categoryChoices) || [];
          const p = (meta == null ? void 0 : meta.protectionLevelChoices) || [];
          const o = (meta == null ? void 0 : meta.ownershipChoices) || [];
          const s = (meta == null ? void 0 : meta.preservationStatusChoices) || [];
          if (!form.category && c.length)
            form.category = c[0].value;
          if (!form.protection_level && p.length) {
            const ds = p.find((item) => item.value === "DS");
            form.protection_level = ds ? ds.value : p[0].value;
          }
          if (!form.ownership && o.length)
            form.ownership = o[0].value;
          if (!form.preservation_status && s.length)
            form.preservation_status = s[0].value;
        },
        { immediate: true, deep: true }
      );
      const altitudeSource = vue.ref("manual");
      const badgeClassMap = {
        dem: "badge-dem",
        hardware: "badge-hardware",
        manual: "badge-manual",
        alert: "badge-alert"
      };
      const categoryLabels = vue.computed(() => {
        var _a;
        return (((_a = props.meta) == null ? void 0 : _a.categoryChoices) || []).map((item) => item.label);
      });
      const protectionLabels = vue.computed(() => {
        var _a;
        return (((_a = props.meta) == null ? void 0 : _a.protectionLevelChoices) || []).map((item) => item.label);
      });
      const ownershipLabels = vue.computed(() => {
        var _a;
        return (((_a = props.meta) == null ? void 0 : _a.ownershipChoices) || []).map((item) => item.label);
      });
      const preservationLabels = vue.computed(() => {
        var _a;
        return (((_a = props.meta) == null ? void 0 : _a.preservationStatusChoices) || []).map((item) => item.label);
      });
      const categoryIndex = vue.computed(() => {
        var _a;
        const idx = (((_a = props.meta) == null ? void 0 : _a.categoryChoices) || []).findIndex((item) => item.value === form.category);
        return idx >= 0 ? idx : 0;
      });
      const protectionIndex = vue.computed(() => {
        var _a;
        const idx = (((_a = props.meta) == null ? void 0 : _a.protectionLevelChoices) || []).findIndex((item) => item.value === form.protection_level);
        return idx >= 0 ? idx : 0;
      });
      const ownershipIndex = vue.computed(() => {
        var _a;
        const idx = (((_a = props.meta) == null ? void 0 : _a.ownershipChoices) || []).findIndex((item) => item.value === form.ownership);
        return idx >= 0 ? idx : 0;
      });
      const preservationIndex = vue.computed(() => {
        var _a;
        const idx = (((_a = props.meta) == null ? void 0 : _a.preservationStatusChoices) || []).findIndex((item) => item.value === form.preservation_status);
        return idx >= 0 ? idx : 0;
      });
      const categoryText = vue.computed(() => categoryLabels.value[categoryIndex.value] || "请选择");
      const protectionText = vue.computed(() => protectionLabels.value[protectionIndex.value] || "请选择");
      const ownershipText = vue.computed(() => ownershipLabels.value[ownershipIndex.value] || "请选择");
      const preservationText = vue.computed(() => preservationLabels.value[preservationIndex.value] || "请选择");
      const provinceOptions = vue.computed(() => CHINA_REGION_TREE.map((item) => item.name));
      const cityOptions = vue.computed(() => {
        const province = CHINA_REGION_TREE.find((item) => item.name === form.province);
        return province ? province.cities.map((item) => item.name) : [];
      });
      const countyOptions = vue.computed(() => {
        const province = CHINA_REGION_TREE.find((item) => item.name === form.province);
        if (!province)
          return [];
        const city = province.cities.find((item) => item.name === form.city);
        return city ? city.counties : [];
      });
      const provinceIndex = vue.computed(() => {
        const idx = provinceOptions.value.findIndex((item) => item === form.province);
        return idx >= 0 ? idx : 0;
      });
      const cityIndex = vue.computed(() => {
        const idx = cityOptions.value.findIndex((item) => item === form.city);
        return idx >= 0 ? idx : 0;
      });
      const countyIndex = vue.computed(() => {
        const idx = countyOptions.value.findIndex((item) => item === form.county);
        return idx >= 0 ? idx : 0;
      });
      const altitudeSourceLabel = vue.computed(() => {
        if (altitudeSource.value === "dem")
          return "🟢 DEM国家高程校准";
        if (altitudeSource.value === "hardware")
          return "🟢 手机硬件直出";
        if (altitudeSource.value === "manual")
          return "灰色 手动录入";
        return "🔴 信号断绝，请手动录入";
      });
      const boundaryPointCount = vue.computed(() => {
        return (coordList.value || []).filter((item) => (item == null ? void 0 : item.type) === "boundary").length;
      });
      function goPrevStep() {
        currentStep.value = Math.max(0, currentStep.value - 1);
      }
      function goStep1ToStep2() {
        currentStep.value = 1;
      }
      function goStep2ToStep3() {
        var _a, _b;
        if (boundaryPointCount.value < 3) {
          uni.showToast({ title: "边界点不足3个，无法进入下一步", icon: "none" });
          return;
        }
        const coordCheck = (_b = (_a = coordRef.value) == null ? void 0 : _a.validateBeforeSubmit) == null ? void 0 : _b.call(_a);
        if (coordCheck && !coordCheck.ok) {
          uni.showToast({ title: coordCheck.message || "坐标采集校验未通过", icon: "none" });
          return;
        }
        currentStep.value = 2;
      }
      function onModeChange(e) {
        var _a;
        const v = (_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value;
        altitudeMode.value = v === "hardware" ? "hardware" : "dem";
      }
      function onCategoryChange(e) {
        var _a, _b, _c;
        const idx = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        const target = (_c = (_b = props.meta) == null ? void 0 : _b.categoryChoices) == null ? void 0 : _c[idx];
        if (target)
          form.category = target.value;
      }
      function onProtectionChange(e) {
        var _a, _b, _c;
        const idx = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        const target = (_c = (_b = props.meta) == null ? void 0 : _b.protectionLevelChoices) == null ? void 0 : _c[idx];
        if (target)
          form.protection_level = target.value;
      }
      function onOwnershipChange(e) {
        var _a, _b, _c;
        const idx = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        const target = (_c = (_b = props.meta) == null ? void 0 : _b.ownershipChoices) == null ? void 0 : _c[idx];
        if (target)
          form.ownership = target.value;
      }
      function onPreservationChange(e) {
        var _a, _b, _c;
        const idx = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        const target = (_c = (_b = props.meta) == null ? void 0 : _b.preservationStatusChoices) == null ? void 0 : _c[idx];
        if (target)
          form.preservation_status = target.value;
      }
      function ensureRegionChain() {
        const province = CHINA_REGION_TREE.find((item) => item.name === form.province) || CHINA_REGION_TREE[0];
        if (!province)
          return;
        form.province = province.name;
        const city = province.cities.find((item) => item.name === form.city) || province.cities[0];
        if (!city)
          return;
        form.city = city.name;
        const county = city.counties.find((item) => item === form.county) || city.counties[0] || "";
        form.county = county;
      }
      function applyDefaultRegion() {
        form.province = DEFAULT_REGION.province;
        form.city = DEFAULT_REGION.city;
        form.county = DEFAULT_REGION.county;
        ensureRegionChain();
      }
      function onProvinceChange(e) {
        var _a;
        const idx = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        form.province = provinceOptions.value[idx] || provinceOptions.value[0] || "";
        ensureRegionChain();
      }
      function onCityChange(e) {
        var _a;
        const idx = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        form.city = cityOptions.value[idx] || cityOptions.value[0] || "";
        ensureRegionChain();
      }
      function onCountyChange(e) {
        var _a;
        const idx = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        form.county = countyOptions.value[idx] || countyOptions.value[0] || "";
      }
      applyDefaultRegion();
      function isInChoices(value, choices) {
        return Array.isArray(choices) && choices.some((item) => item.value === value);
      }
      function isInList(value, list) {
        return Array.isArray(list) && list.includes(value);
      }
      function collectSignature() {
        signStatus.value = "签名已采集";
        uni.showToast({ title: "签名采集成功", icon: "success" });
      }
      function setMainAltitude(altitude, sourceTag, sourceKey) {
        if (Number.isFinite(Number(altitude))) {
          form.altitude = Number(altitude).toFixed(2);
        }
        if (sourceKey === "dem")
          altitudeSource.value = "dem";
        else if (sourceKey === "hardware")
          altitudeSource.value = "hardware";
        else if (sourceKey === "alert")
          altitudeSource.value = "alert";
        else
          altitudeSource.value = "manual";
        uni.showToast({ title: sourceTag, icon: "none", duration: 1800 });
      }
      function getWatermarkUserName() {
        const user = getUser() || {};
        return user.full_name || user.username || "未登录用户";
      }
      function getSelectedSiteName() {
        return form.name || "未命名文物";
      }
      function buildWatermarkText(time) {
        const longitude = Number(form.longitude || 0).toFixed(6);
        const latitude = Number(form.latitude || 0).toFixed(6);
        return `用户: ${getWatermarkUserName()}
文物点: ${getSelectedSiteName()}
时间: ${time}
经纬度: ${longitude}, ${latitude}`;
      }
      function normalizeHardwareAltitude(rawAltitude) {
        const altitude = Number(rawAltitude);
        if (!Number.isFinite(altitude))
          return null;
        if (Math.abs(altitude) < ALTITUDE_ZERO_EPS)
          return null;
        if (altitude < ALTITUDE_MIN_M || altitude > ALTITUDE_MAX_M)
          return null;
        return altitude;
      }
      function requestDemAltitude(longitude, latitude) {
        return new Promise((resolve, reject) => {
          const fallbackDirectUrl = `${config.WEB_BASE_URL}/api/dem-elevation-lookup/`;
          const fallbackAppApiUrl = `${config.WEB_BASE_URL}/app-api/api/dem-elevation-lookup/`;
          const fallbackByReplace = `${String(config.API_BASE_URL || "").replace(/\/app-api\/?$/, "")}/api/dem-elevation-lookup/`;
          const urlCandidates = Array.from(new Set([fallbackDirectUrl, fallbackAppApiUrl, fallbackByReplace].filter(Boolean)));
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
              header: { "Content-Type": "application/json" },
              data: { longitude, latitude },
              success: (res) => {
                const data = (res == null ? void 0 : res.data) || {};
                if (res.statusCode !== 200) {
                  tryNext(new Error(`DEM HTTP ${res.statusCode || "ERR"}`));
                  return;
                }
                const demOk = data.code === 200 || data.success === true || data.status === "success";
                const demAltitude = data.altitude ?? data.elevation ?? (data.data && (data.data.altitude ?? data.data.elevation));
                if (!demOk || demAltitude == null || Number.isNaN(Number(demAltitude))) {
                  tryNext(new Error("DEM 返回无有效高程"));
                  return;
                }
                resolve(Number(demAltitude));
              },
              fail: () => tryNext(new Error("DEM 请求失败"))
            });
          };
          tryNext();
        });
      }
      async function resolveAltitude(lon, lat, gpsHardwareAlt) {
        const hardware = normalizeHardwareAltitude(gpsHardwareAlt);
        if (altitudeMode.value === "hardware") {
          if (hardware != null) {
            return { altitude: hardware, sourceTag: "🟢 手机硬件直出", sourceKey: "hardware" };
          }
          return { altitude: null, sourceTag: "🔴 硬件海拔无效，请手动录入", sourceKey: "alert" };
        }
        try {
          const demAltitude = await requestDemAltitude(lon, lat);
          return { altitude: demAltitude, sourceTag: "🟢 DEM国家高程校准", sourceKey: "dem" };
        } catch (_) {
          if (hardware != null) {
            return { altitude: hardware, sourceTag: "🟡 手机硬件(无网保底)", sourceKey: "hardware" };
          }
          return { altitude: null, sourceTag: "🔴 DEM不可用且硬件海拔无效，请手动录入", sourceKey: "alert" };
        }
      }
      function getNativeGpsPosition() {
        return new Promise((resolve, reject) => {
          const resolveByPlusGeolocation = () => {
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
                reject(err || new Error("gps failed"));
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
          };
          try {
            const isAndroid = typeof plus !== "undefined" && plus.os && String(plus.os.name || "").toLowerCase() === "android";
            if (!isAndroid || !plus.android) {
              resolveByPlusGeolocation();
              return;
            }
            plus.android.importClass("android.location.LocationManager");
            const activity = plus.android.runtimeMainActivity();
            const locationManager = plus.android.invoke(activity, "getSystemService", "location");
            if (!locationManager) {
              resolveByPlusGeolocation();
              return;
            }
            const provider = "gps";
            const providerEnabled = plus.android.invoke(locationManager, "isProviderEnabled", provider);
            if (!providerEnabled) {
              resolveByPlusGeolocation();
              return;
            }
            let done = false;
            let timeoutTimer = null;
            let listener = null;
            const parseLocation = (loc) => {
              if (!loc)
                return null;
              const longitude = Number(plus.android.invoke(loc, "getLongitude"));
              const latitude = Number(plus.android.invoke(loc, "getLatitude"));
              if (!Number.isFinite(longitude) || !Number.isFinite(latitude))
                return null;
              const hasAltitude = !!plus.android.invoke(loc, "hasAltitude");
              const hasAccuracy = !!plus.android.invoke(loc, "hasAccuracy");
              const altitude = hasAltitude ? Number(plus.android.invoke(loc, "getAltitude")) : null;
              const accuracy = hasAccuracy ? Number(plus.android.invoke(loc, "getAccuracy")) : null;
              return {
                longitude,
                latitude,
                altitude: Number.isFinite(altitude) ? altitude : null,
                accuracy: Number.isFinite(accuracy) ? accuracy : null
              };
            };
            const finish = (payload, err) => {
              if (done)
                return;
              done = true;
              if (timeoutTimer)
                clearTimeout(timeoutTimer);
              try {
                if (listener)
                  plus.android.invoke(locationManager, "removeUpdates", listener);
              } catch (_) {
              }
              if (err) {
                resolveByPlusGeolocation();
                return;
              }
              resolve(payload);
            };
            listener = plus.android.implements("android.location.LocationListener", {
              onLocationChanged: (location) => {
                const parsed = parseLocation(location);
                if (parsed)
                  finish(parsed, null);
              },
              onStatusChanged: () => {
              },
              onProviderEnabled: () => {
              },
              onProviderDisabled: () => {
              }
            });
            const lastKnown = plus.android.invoke(locationManager, "getLastKnownLocation", provider);
            const parsedLastKnown = parseLocation(lastKnown);
            if (parsedLastKnown) {
              finish(parsedLastKnown, null);
              return;
            }
            plus.android.invoke(locationManager, "requestLocationUpdates", provider, 0, 0, listener);
            timeoutTimer = setTimeout(() => {
              finish(null, new Error("android gps timeout"));
            }, GPS_TIMEOUT_MS);
          } catch (_) {
            resolveByPlusGeolocation();
          }
        });
      }
      async function capturePointData() {
        const gps = await getNativeGpsPosition();
        const lon = Number(gps.longitude);
        const lat = Number(gps.latitude);
        const hardwareAlt = Number.isFinite(Number(gps.altitude)) ? Number(gps.altitude) : null;
        const result = await resolveAltitude(lon, lat, hardwareAlt);
        return {
          longitude: lon,
          latitude: lat,
          altitude: result.altitude,
          sourceTag: result.sourceTag
        };
      }
      async function handleCollectCoordinate() {
        try {
          const r = await capturePointData();
          form.longitude = Number(r.longitude).toFixed(8);
          form.latitude = Number(r.latitude).toFixed(8);
          setMainAltitude(r.altitude, r.sourceTag, r.sourceTag.includes("DEM") ? "dem" : r.sourceTag.includes("硬件") ? "hardware" : "alert");
        } catch (_) {
          uni.showToast({ title: "定位采集失败，请重试", icon: "none" });
        }
      }
      async function handleCollectAltitude() {
        try {
          const r = await capturePointData();
          if (Number.isFinite(Number(r.longitude)) && Number.isFinite(Number(r.latitude))) {
            form.longitude = Number(r.longitude).toFixed(8);
            form.latitude = Number(r.latitude).toFixed(8);
          }
          setMainAltitude(r.altitude, r.sourceTag, r.sourceTag.includes("DEM") ? "dem" : r.sourceTag.includes("硬件") ? "hardware" : "alert");
        } catch (_) {
          uni.showToast({ title: "海拔采集失败，请重试", icon: "none" });
        }
      }
      function pickPhoto() {
        const remain = 10 - photos.value.length;
        uni.chooseImage({
          count: remain,
          sizeType: ["compressed"],
          sourceType: ["camera", "album"],
          success: async (res) => {
            const tempFilePaths = res.tempFilePaths || [];
            const selected = [];
            for (let index = 0; index < tempFilePaths.length; index += 1) {
              const path = tempFilePaths[index];
              const now = /* @__PURE__ */ new Date();
              const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
              const watermarkText = buildWatermarkText(time);
              try {
                await vue.nextTick();
                const watermarkedPath = await addWatermark(path, watermarkText, instance.proxy);
                selected.push({ id: `${Date.now()}_${index}`, path: watermarkedPath });
              } catch (_) {
                selected.push({ id: `${Date.now()}_${index}`, path });
              }
            }
            photos.value = photos.value.concat(selected).slice(0, 10);
          }
        });
      }
      function removePhoto(index) {
        photos.value.splice(index, 1);
      }
      function validateForm() {
        var _a, _b, _c, _d;
        if (!form.name.trim())
          return "请填写文物名称";
        if (!form.surveyCodeAuto) {
          const code = form.code.trim();
          if (!code)
            return "手动模式下请填写普查编号";
          if (!/^SS-CJ-\d{4}-\d{4}$/.test(code))
            return "普查编号格式应为 SS-CJ-YYYY-NNNN";
        }
        if (!form.era.trim())
          return "请填写时代";
        if (!form.category)
          return "请选择文物类别";
        if (!isInChoices(form.category, ((_a = props.meta) == null ? void 0 : _a.categoryChoices) || []))
          return "文物类别无效，请重新选择";
        if (!form.longitude.trim() || !form.latitude.trim())
          return "请采集经纬度";
        const lon = Number(form.longitude);
        const lat = Number(form.latitude);
        if (!Number.isFinite(lon) || lon < -180 || lon > 180)
          return "经度须在 -180 到 180 之间";
        if (!Number.isFinite(lat) || lat < -90 || lat > 90)
          return "纬度须在 -90 到 90 之间";
        if (form.altitude.trim()) {
          const alt = Number(form.altitude);
          if (!Number.isFinite(alt))
            return "海拔必须为数字";
        }
        if (!form.province.trim())
          return "请填写省/自治区";
        if (!isInList(form.province, provinceOptions.value))
          return "省份选择无效，请重新选择";
        if (!isInList(form.city, cityOptions.value))
          return "城市选择无效，请重新选择";
        if (!isInList(form.county, countyOptions.value))
          return "区县选择无效，请重新选择";
        if (!form.address.trim())
          return "请填写详细地址";
        if (!form.protection_level || !isInChoices(form.protection_level, ((_b = props.meta) == null ? void 0 : _b.protectionLevelChoices) || [])) {
          return "保护级别无效，请重新选择";
        }
        if (!form.ownership || !isInChoices(form.ownership, ((_c = props.meta) == null ? void 0 : _c.ownershipChoices) || [])) {
          return "权属无效，请重新选择";
        }
        if (!form.preservation_status || !isInChoices(form.preservation_status, ((_d = props.meta) == null ? void 0 : _d.preservationStatusChoices) || [])) {
          return "保存现状无效，请重新选择";
        }
        if (!signStatus.value)
          return "请先完成普查员签名";
        return "";
      }
      function handleSubmit() {
        var _a, _b;
        if (props.loading)
          return;
        const coordCheck = (_b = (_a = coordRef.value) == null ? void 0 : _a.validateBeforeSubmit) == null ? void 0 : _b.call(_a);
        if (coordCheck && !coordCheck.ok) {
          uni.showToast({ title: coordCheck.message || "坐标采集校验未通过", icon: "none" });
          return;
        }
        const msg = validateForm();
        if (msg) {
          uni.showToast({ title: msg, icon: "none" });
          return;
        }
        emitting("submit", {
          ...form,
          coord_list: coordList.value,
          altitude_mode: altitudeMode.value,
          altitude_source: altitudeSource.value,
          photos: photos.value,
          signature_status: signStatus.value
        });
      }
      __expose({
        form,
        altitudeMode,
        resolveAltitude,
        capturePointData
      });
      const __returned__ = { DEM_TIMEOUT_MS, ALTITUDE_MIN_M, ALTITUDE_MAX_M, ALTITUDE_ZERO_EPS, GPS_TIMEOUT_MS, props, emitting, currentStep, stepDefs, stepNodeClass, altitudeMode, photos, signStatus, watermarkCanvas, coordRef, coordList, instance, form, altitudeSource, badgeClassMap, categoryLabels, protectionLabels, ownershipLabels, preservationLabels, categoryIndex, protectionIndex, ownershipIndex, preservationIndex, categoryText, protectionText, ownershipText, preservationText, provinceOptions, cityOptions, countyOptions, provinceIndex, cityIndex, countyIndex, altitudeSourceLabel, boundaryPointCount, goPrevStep, goStep1ToStep2, goStep2ToStep3, onModeChange, onCategoryChange, onProtectionChange, onOwnershipChange, onPreservationChange, ensureRegionChain, applyDefaultRegion, onProvinceChange, onCityChange, onCountyChange, isInChoices, isInList, collectSignature, setMainAltitude, getWatermarkUserName, getSelectedSiteName, buildWatermarkText, normalizeHardwareAltitude, requestDemAltitude, resolveAltitude, getNativeGpsPosition, capturePointData, handleCollectCoordinate, handleCollectAltitude, pickPhoto, removePhoto, validateForm, handleSubmit, computed: vue.computed, getCurrentInstance: vue.getCurrentInstance, nextTick: vue.nextTick, reactive: vue.reactive, ref: vue.ref, watch: vue.watch, get config() {
        return config;
      }, get CHINA_REGION_TREE() {
        return CHINA_REGION_TREE;
      }, get DEFAULT_REGION() {
        return DEFAULT_REGION;
      }, get addWatermark() {
        return addWatermark;
      }, get getUser() {
        return getUser;
      }, CoordinateCollectCard };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "wizard-page" }, [
      vue.createElementVNode("view", { class: "wizard-header" }, [
        vue.createElementVNode("view", { class: "header-top" }, [
          vue.createElementVNode("text", { class: "page-title" }, "不可移动文物现场数据采集"),
          vue.createElementVNode("text", { class: "page-subtitle" }, "横向流程式录入")
        ]),
        vue.createElementVNode("view", { class: "stepper-wrap" }, [
          (vue.openBlock(), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($setup.stepDefs, (step, idx) => {
              return vue.createElementVNode("view", {
                key: step.key,
                class: "stepper-item"
              }, [
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["stepper-node", $setup.stepNodeClass(idx)])
                  },
                  [
                    vue.createElementVNode(
                      "text",
                      { class: "stepper-node-text" },
                      vue.toDisplayString($setup.currentStep > idx ? "✓" : idx + 1),
                      1
                      /* TEXT */
                    )
                  ],
                  2
                  /* CLASS */
                ),
                vue.createElementVNode(
                  "text",
                  {
                    class: vue.normalizeClass(["stepper-label", { active: $setup.currentStep === idx }])
                  },
                  vue.toDisplayString(step.label),
                  3
                  /* TEXT, CLASS */
                ),
                idx < $setup.stepDefs.length - 1 ? (vue.openBlock(), vue.createElementBlock(
                  "view",
                  {
                    key: 0,
                    class: vue.normalizeClass(["stepper-line", { done: $setup.currentStep > idx }])
                  },
                  null,
                  2
                  /* CLASS */
                )) : vue.createCommentVNode("v-if", true)
              ]);
            }),
            64
            /* STABLE_FRAGMENT */
          ))
        ])
      ]),
      vue.createElementVNode("view", { class: "wizard-content" }, [
        $setup.currentStep === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "step-panel"
        }, [
          vue.createElementVNode("view", { class: "card step-card" }, [
            vue.createElementVNode("view", { class: "card-head" }, [
              vue.createElementVNode("text", { class: "card-title" }, "第一步：基础地理"),
              vue.createElementVNode("text", { class: "card-tag" }, "信息校核")
            ]),
            vue.createElementVNode("view", { class: "strategy-card" }, [
              vue.createElementVNode("view", { class: "strategy-head" }, [
                vue.createElementVNode("text", { class: "strategy-title" }, "全局采集策略")
              ]),
              vue.createElementVNode(
                "radio-group",
                {
                  class: "strategy-group",
                  onChange: $setup.onModeChange
                },
                [
                  vue.createElementVNode("label", { class: "strategy-item" }, [
                    vue.createElementVNode("radio", {
                      value: "dem",
                      checked: $setup.altitudeMode === "dem",
                      color: "#1890FF"
                    }, null, 8, ["checked"]),
                    vue.createElementVNode("view", { class: "strategy-copy" }, [
                      vue.createElementVNode("text", { class: "strategy-copy-title" }, "DEM 优先模式（推荐）"),
                      vue.createElementVNode("text", { class: "strategy-copy-desc" }, "优先后端 DEM 反查，弱网时自动降级硬件海拔")
                    ])
                  ]),
                  vue.createElementVNode("label", { class: "strategy-item" }, [
                    vue.createElementVNode("radio", {
                      value: "hardware",
                      checked: $setup.altitudeMode === "hardware",
                      color: "#1890FF"
                    }, null, 8, ["checked"]),
                    vue.createElementVNode("view", { class: "strategy-copy" }, [
                      vue.createElementVNode("text", { class: "strategy-copy-title" }, "硬件优先模式"),
                      vue.createElementVNode("text", { class: "strategy-copy-desc" }, "跳过 DEM 请求，直接使用手机硬件高程")
                    ])
                  ])
                ],
                32
                /* NEED_HYDRATION */
              )
            ]),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("text", { class: "row-label required" }, "文物名称"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  class: "row-input",
                  "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.form.name = $event),
                  placeholder: "请输入文物名称",
                  maxlength: "200"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $setup.form.name]
              ])
            ]),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("text", { class: "row-label" }, "曾用名"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  class: "row-input",
                  "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $setup.form.former_name = $event),
                  placeholder: "选填",
                  maxlength: "200"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $setup.form.former_name]
              ])
            ]),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("text", { class: "row-label" }, "编号模式"),
              vue.createElementVNode("view", { class: "mode-switch" }, [
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["mode-item", { active: $setup.form.surveyCodeAuto }]),
                    onClick: _cache[2] || (_cache[2] = ($event) => $setup.form.surveyCodeAuto = true)
                  },
                  "自动",
                  2
                  /* CLASS */
                ),
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["mode-item", { active: !$setup.form.surveyCodeAuto }]),
                    onClick: _cache[3] || (_cache[3] = ($event) => $setup.form.surveyCodeAuto = false)
                  },
                  "手动",
                  2
                  /* CLASS */
                )
              ])
            ]),
            !$setup.form.surveyCodeAuto ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "form-row"
            }, [
              vue.createElementVNode("text", { class: "row-label required" }, "普查编号"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  class: "row-input",
                  "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $setup.form.code = $event),
                  placeholder: "请输入普查编号",
                  maxlength: "50"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $setup.form.code]
              ])
            ])) : vue.createCommentVNode("v-if", true),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("text", { class: "row-label required" }, "时代"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  class: "row-input",
                  "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $setup.form.era = $event),
                  placeholder: "如：汉、唐宋",
                  maxlength: "100"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $setup.form.era]
              ])
            ]),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("text", { class: "row-label required" }, "文物类别"),
              vue.createElementVNode("picker", {
                class: "picker-wrap",
                range: $setup.categoryLabels,
                value: $setup.categoryIndex,
                onChange: $setup.onCategoryChange
              }, [
                vue.createElementVNode(
                  "view",
                  { class: "picker-value" },
                  vue.toDisplayString($setup.categoryText),
                  1
                  /* TEXT */
                )
              ], 40, ["range", "value"])
            ]),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("text", { class: "row-label required" }, "经度"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  class: "row-input",
                  "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => $setup.form.longitude = $event),
                  type: "digit",
                  placeholder: "自动采集或手动填写"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $setup.form.longitude]
              ])
            ]),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("text", { class: "row-label required" }, "纬度"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  class: "row-input",
                  "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => $setup.form.latitude = $event),
                  type: "digit",
                  placeholder: "自动采集或手动填写"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $setup.form.latitude]
              ])
            ]),
            vue.createElementVNode("view", { class: "form-row row-altitude" }, [
              vue.createElementVNode("text", { class: "row-label required" }, "海拔"),
              vue.createElementVNode("view", { class: "altitude-cell" }, [
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "row-input altitude-input",
                    "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => $setup.form.altitude = $event),
                    type: "digit",
                    placeholder: "自动采集或手动填写"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $setup.form.altitude]
                ]),
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["alt-badge", $setup.badgeClassMap[$setup.altitudeSource]])
                  },
                  [
                    vue.createElementVNode(
                      "text",
                      { class: "alt-badge-text" },
                      vue.toDisplayString($setup.altitudeSourceLabel),
                      1
                      /* TEXT */
                    )
                  ],
                  2
                  /* CLASS */
                )
              ])
            ]),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("text", { class: "row-label" }, "省/自治区"),
              vue.createElementVNode("picker", {
                class: "picker-wrap",
                range: $setup.provinceOptions,
                value: $setup.provinceIndex,
                onChange: $setup.onProvinceChange
              }, [
                vue.createElementVNode(
                  "view",
                  { class: "picker-value" },
                  vue.toDisplayString($setup.form.province || "请选择"),
                  1
                  /* TEXT */
                )
              ], 40, ["range", "value"])
            ]),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("text", { class: "row-label" }, "市/州"),
              vue.createElementVNode("picker", {
                class: "picker-wrap",
                range: $setup.cityOptions,
                value: $setup.cityIndex,
                onChange: $setup.onCityChange
              }, [
                vue.createElementVNode(
                  "view",
                  { class: "picker-value" },
                  vue.toDisplayString($setup.form.city || "请选择"),
                  1
                  /* TEXT */
                )
              ], 40, ["range", "value"])
            ]),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("text", { class: "row-label" }, "县/区"),
              vue.createElementVNode("picker", {
                class: "picker-wrap",
                range: $setup.countyOptions,
                value: $setup.countyIndex,
                onChange: $setup.onCountyChange
              }, [
                vue.createElementVNode(
                  "view",
                  { class: "picker-value" },
                  vue.toDisplayString($setup.form.county || "请选择"),
                  1
                  /* TEXT */
                )
              ], 40, ["range", "value"])
            ]),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("text", { class: "row-label" }, "乡镇/街道"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  class: "row-input",
                  "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => $setup.form.township = $event),
                  placeholder: "选填",
                  maxlength: "50"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $setup.form.township]
              ])
            ]),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("text", { class: "row-label" }, "村/社区"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  class: "row-input",
                  "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => $setup.form.village = $event),
                  placeholder: "选填",
                  maxlength: "50"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $setup.form.village]
              ])
            ]),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("text", { class: "row-label" }, "详细地址"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  class: "row-input",
                  "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => $setup.form.address = $event),
                  placeholder: "选填",
                  maxlength: "500"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $setup.form.address]
              ])
            ]),
            vue.createElementVNode("view", { class: "btn-group-compact" }, [
              vue.createElementVNode("button", {
                class: "btn-secondary",
                onClick: $setup.handleCollectCoordinate
              }, "采集坐标"),
              vue.createElementVNode("button", {
                class: "btn-secondary",
                onClick: $setup.handleCollectAltitude
              }, "采集海拔")
            ])
          ])
        ])) : vue.createCommentVNode("v-if", true),
        $setup.currentStep === 1 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "step-panel"
        }, [
          vue.createElementVNode("view", { class: "card step-card step2-focus" }, [
            vue.createElementVNode("view", { class: "card-head" }, [
              vue.createElementVNode("text", { class: "card-title" }, "第二步：多点坐标"),
              vue.createElementVNode("text", { class: "card-tag warm" }, "高频核心操作区")
            ]),
            vue.createElementVNode("view", { class: "focus-tip" }, [
              vue.createElementVNode("text", { class: "focus-tip-text" }, "围绕遗址走动采集时，请优先使用“新增定位点”和“实时定位”完成边界点/标志点录入。")
            ]),
            vue.createVNode($setup["CoordinateCollectCard"], {
              ref: "coordRef",
              modelValue: $setup.coordList,
              "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => $setup.coordList = $event),
              "heritage-name": $setup.form.name,
              "capture-point-data": $setup.capturePointData
            }, null, 8, ["modelValue", "heritage-name"]),
            vue.createElementVNode("view", { class: "step2-meta" }, [
              vue.createElementVNode(
                "text",
                { class: "step2-meta-text" },
                "当前边界点：" + vue.toDisplayString($setup.boundaryPointCount) + " 个（至少 3 个）",
                1
                /* TEXT */
              )
            ])
          ])
        ])) : vue.createCommentVNode("v-if", true),
        $setup.currentStep === 2 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 2,
          class: "step-panel"
        }, [
          vue.createElementVNode("view", { class: "card step-card" }, [
            vue.createElementVNode("view", { class: "card-head" }, [
              vue.createElementVNode("text", { class: "card-title" }, "第三步：多媒体/审核"),
              vue.createElementVNode("text", { class: "card-tag" }, "提交前复核")
            ]),
            vue.createElementVNode("view", { class: "form-row column-row" }, [
              vue.createElementVNode("view", { class: "column-head" }, [
                vue.createElementVNode("text", { class: "row-label required" }, "现场照片"),
                vue.createElementVNode("text", { class: "column-meta" }, "最多 10 张")
              ]),
              vue.createElementVNode("view", { class: "photo-grid" }, [
                (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList($setup.photos, (item, idx) => {
                    return vue.openBlock(), vue.createElementBlock("view", {
                      key: item.id,
                      class: "photo-item"
                    }, [
                      vue.createElementVNode("image", {
                        src: item.path,
                        class: "photo-img",
                        mode: "aspectFill"
                      }, null, 8, ["src"]),
                      vue.createElementVNode("view", {
                        class: "photo-remove",
                        onClick: ($event) => $setup.removePhoto(idx)
                      }, [
                        vue.createElementVNode("text", { class: "photo-remove-text" }, "删")
                      ], 8, ["onClick"])
                    ]);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                )),
                $setup.photos.length < 10 ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "photo-add",
                  onClick: $setup.pickPhoto
                }, [
                  vue.createElementVNode("text", { class: "photo-add-text" }, "添加照片")
                ])) : vue.createCommentVNode("v-if", true)
              ])
            ]),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("text", { class: "row-label" }, "保护级别"),
              vue.createElementVNode("picker", {
                class: "picker-wrap",
                range: $setup.protectionLabels,
                value: $setup.protectionIndex,
                onChange: $setup.onProtectionChange
              }, [
                vue.createElementVNode(
                  "view",
                  { class: "picker-value" },
                  vue.toDisplayString($setup.protectionText),
                  1
                  /* TEXT */
                )
              ], 40, ["range", "value"])
            ]),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("text", { class: "row-label" }, "权属"),
              vue.createElementVNode("picker", {
                class: "picker-wrap",
                range: $setup.ownershipLabels,
                value: $setup.ownershipIndex,
                onChange: $setup.onOwnershipChange
              }, [
                vue.createElementVNode(
                  "view",
                  { class: "picker-value" },
                  vue.toDisplayString($setup.ownershipText),
                  1
                  /* TEXT */
                )
              ], 40, ["range", "value"])
            ]),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("text", { class: "row-label" }, "保存现状"),
              vue.createElementVNode("picker", {
                class: "picker-wrap",
                range: $setup.preservationLabels,
                value: $setup.preservationIndex,
                onChange: $setup.onPreservationChange
              }, [
                vue.createElementVNode(
                  "view",
                  { class: "picker-value" },
                  vue.toDisplayString($setup.preservationText),
                  1
                  /* TEXT */
                )
              ], 40, ["range", "value"])
            ]),
            vue.createElementVNode("view", { class: "form-row" }, [
              vue.createElementVNode("text", { class: "row-label required" }, "普查员签名"),
              vue.createElementVNode("button", {
                class: "btn-secondary single-btn",
                onClick: $setup.collectSignature
              }, "采集签名")
            ]),
            $setup.signStatus ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "inline-hint"
            }, [
              vue.createElementVNode(
                "text",
                { class: "inline-hint-text" },
                vue.toDisplayString($setup.signStatus),
                1
                /* TEXT */
              )
            ])) : vue.createCommentVNode("v-if", true),
            vue.createElementVNode("view", { class: "form-row column-row" }, [
              vue.createElementVNode("view", { class: "column-head" }, [
                vue.createElementVNode("text", { class: "row-label" }, "现场备注"),
                vue.createElementVNode("text", { class: "column-meta" }, "限 2000 字")
              ]),
              vue.withDirectives(vue.createElementVNode(
                "textarea",
                {
                  class: "remark-input",
                  "onUpdate:modelValue": _cache[13] || (_cache[13] = ($event) => $setup.form.remark = $event),
                  maxlength: "2000",
                  placeholder: "请填写现场情况、病害信息、交通与环境说明"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $setup.form.remark]
              ])
            ])
          ])
        ])) : vue.createCommentVNode("v-if", true)
      ]),
      vue.createElementVNode("view", { class: "wizard-footer" }, [
        $setup.currentStep === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "footer-row single"
        }, [
          vue.createElementVNode("button", {
            class: "btn-flow btn-flow-primary btn-flow-wide",
            onClick: $setup.goStep1ToStep2
          }, "下一步：采集坐标")
        ])) : vue.createCommentVNode("v-if", true),
        $setup.currentStep === 1 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "footer-row split"
        }, [
          vue.createElementVNode("button", {
            class: "btn-flow btn-flow-ghost left",
            onClick: $setup.goPrevStep
          }, "返回上一步"),
          vue.createElementVNode("button", {
            class: "btn-flow btn-flow-primary right",
            onClick: $setup.goStep2ToStep3
          }, "下一步：多媒体/审核")
        ])) : vue.createCommentVNode("v-if", true),
        $setup.currentStep === 2 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 2,
          class: "footer-row split"
        }, [
          vue.createElementVNode("button", {
            class: "btn-flow btn-flow-ghost left",
            onClick: $setup.goPrevStep
          }, "返回上一步"),
          vue.createElementVNode("button", {
            class: "btn-flow btn-flow-submit right",
            disabled: $props.loading,
            onClick: $setup.handleSubmit
          }, vue.toDisplayString($props.loading ? "提交中..." : "完成并提交数据"), 9, ["disabled"])
        ])) : vue.createCommentVNode("v-if", true)
      ]),
      vue.createElementVNode("canvas", {
        "canvas-id": "watermarkCanvas",
        width: $setup.watermarkCanvas.width,
        height: $setup.watermarkCanvas.height,
        style: vue.normalizeStyle(`position:absolute;left:-9999px;top:-9999px;width:${$setup.watermarkCanvas.width}px;height:${$setup.watermarkCanvas.height}px;pointer-events:none;`)
      }, null, 12, ["width", "height"])
    ]);
  }
  const HeritageCollectRefactor = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$2], ["__scopeId", "data-v-ebe4f3bc"], ["__file", "C:/Users/14434/uniapp/components/HeritageCollectRefactor.vue"]]);
  const _sfc_main$2 = {
    __name: "collect",
    setup(__props, { expose: __expose }) {
      __expose();
      const API2 = config.API_BASE_URL;
      const collectRef = vue.ref(null);
      const submitting = vue.ref(false);
      const formMeta = vue.reactive({
        categoryChoices: [],
        protectionLevelChoices: [],
        ownershipChoices: [],
        preservationStatusChoices: []
      });
      onLoad(() => {
        if (!getToken()) {
          uni.reLaunch({ url: "/pages/index/index" });
          return;
        }
        loadFormMetaDefaults();
      });
      function cleanText(value) {
        return String(value || "").trim();
      }
      function loadFormMetaDefaults() {
        uni.request({
          url: `${API2}/api/collect/form-meta`,
          header: { Authorization: `Bearer ${getToken()}` },
          success: (res) => {
            if (res.statusCode !== 200 || !res.data)
              return;
            const d = res.data;
            formMeta.categoryChoices = d.category_choices || [];
            formMeta.protectionLevelChoices = d.protection_level_choices || [];
            formMeta.ownershipChoices = d.ownership_choices || [];
            formMeta.preservationStatusChoices = d.preservation_status_choices || [];
          },
          fail: () => {
            formMeta.categoryChoices = [
              { value: "GWZ", label: "古文化遗址" },
              { value: "GMZ", label: "古墓葬" },
              { value: "GJZ", label: "古建筑" },
              { value: "SKT", label: "石窟寺及石刻" },
              { value: "JDJW", label: "近现代重要史迹及代表性建筑" },
              { value: "QT", label: "其他" }
            ];
            formMeta.protectionLevelChoices = [
              { value: "GB", label: "全国重点文物保护单位" },
              { value: "SB", label: "省（自治区、直辖市）级文物保护单位" },
              { value: "XB", label: "市（县）级文物保护单位" },
              { value: "DS", label: "尚未定级的不可移动文物" }
            ];
            formMeta.ownershipChoices = [
              { value: "state", label: "国有" },
              { value: "collective", label: "集体" },
              { value: "private", label: "私人" },
              { value: "other", label: "其他" }
            ];
            formMeta.preservationStatusChoices = [
              { value: "好", label: "好" },
              { value: "较好", label: "较好" },
              { value: "一般", label: "一般" },
              { value: "较差", label: "较差" },
              { value: "差", label: "差" }
            ];
          }
        });
      }
      function createHeritage(payload) {
        const longitude = Number(payload.longitude);
        const latitude = Number(payload.latitude);
        const altitude = payload.altitude !== "" && payload.altitude != null ? Number(payload.altitude) : null;
        const resolvedCategory = cleanText(payload.category);
        const resolvedProtection = cleanText(payload.protection_level);
        const resolvedOwnership = cleanText(payload.ownership);
        const resolvedPreservation = cleanText(payload.preservation_status);
        return new Promise((resolve, reject) => {
          uni.request({
            url: `${API2}/api/collect/create`,
            method: "POST",
            header: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getToken()}`
            },
            data: {
              survey_code: payload.surveyCodeAuto ? "" : cleanText(payload.code),
              name: cleanText(payload.name),
              former_name: cleanText(payload.former_name),
              era: cleanText(payload.era),
              category: resolvedCategory,
              coord_list: Array.isArray(payload.coord_list) ? payload.coord_list : [],
              province: cleanText(payload.province),
              city: cleanText(payload.city),
              county: cleanText(payload.county),
              township: cleanText(payload.township),
              village: cleanText(payload.village),
              address: cleanText(payload.address),
              longitude: Number.isFinite(longitude) ? longitude : null,
              latitude: Number.isFinite(latitude) ? latitude : null,
              altitude: Number.isFinite(altitude) ? altitude : null,
              protection_level: resolvedProtection,
              ownership: resolvedOwnership,
              preservation_status: resolvedPreservation,
              description: cleanText(payload.remark)
            },
            success: (res) => {
              var _a, _b, _c, _d;
              if (res.statusCode === 201) {
                resolve({
                  heritage_id: (_a = res.data) == null ? void 0 : _a.heritage_id,
                  survey_code: ((_b = res.data) == null ? void 0 : _b.survey_code) || ""
                });
                return;
              }
              reject(((_c = res.data) == null ? void 0 : _c.detail) || ((_d = res.data) == null ? void 0 : _d.message) || "创建失败");
            },
            fail: (err) => reject((err == null ? void 0 : err.errMsg) || "网络异常")
          });
        });
      }
      function uploadPhoto(heritageId, filePath, isCover) {
        return new Promise((resolve, reject) => {
          uni.uploadFile({
            url: `${API2}/api/collect/photos/${heritageId}`,
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
                  resolve(data || {});
                else
                  reject((data == null ? void 0 : data.detail) || "上传失败");
              } catch (_) {
                if (res.statusCode === 201)
                  resolve({});
                else
                  reject("上传响应解析失败");
              }
            },
            fail: (err) => reject((err == null ? void 0 : err.errMsg) || "网络异常")
          });
        });
      }
      async function handleSubmit(payload) {
        var _a;
        if (submitting.value)
          return;
        submitting.value = true;
        try {
          const created = await createHeritage(payload);
          const photos = Array.isArray(payload.photos) ? payload.photos : [];
          let successCount = 0;
          for (let i = 0; i < photos.length; i += 1) {
            const path = (_a = photos[i]) == null ? void 0 : _a.path;
            if (!path)
              continue;
            try {
              await uploadPhoto(created.heritage_id, path, i === 0);
              successCount += 1;
            } catch (_) {
            }
          }
          const suffix = photos.length > 0 ? `，照片 ${successCount}/${photos.length}` : "";
          uni.showModal({
            title: "采集提交成功",
            content: `编号：${created.survey_code || "已生成"}${suffix}`,
            showCancel: false
          });
        } catch (err) {
          uni.showToast({
            title: `提交失败：${String(err || "未知错误")}`,
            icon: "none",
            duration: 3e3
          });
        } finally {
          submitting.value = false;
        }
      }
      const __returned__ = { API: API2, collectRef, submitting, formMeta, cleanText, loadFormMetaDefaults, createHeritage, uploadPhoto, handleSubmit, get onLoad() {
        return onLoad;
      }, reactive: vue.reactive, ref: vue.ref, get config() {
        return config;
      }, get getToken() {
        return getToken;
      }, HeritageCollectRefactor };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "page-wrap" }, [
      vue.createVNode($setup["HeritageCollectRefactor"], {
        ref: "collectRef",
        loading: $setup.submitting,
        meta: $setup.formMeta,
        onSubmit: $setup.handleSubmit
      }, null, 8, ["loading", "meta"])
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
