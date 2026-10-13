const pageTitleKeys = {
	index: 'nav.app',
	home: 'nav.home',
	patrol: 'nav.patrol',
	records: 'nav.records',
	my: 'nav.my',
	about: 'nav.about',
	admin: 'nav.admin',
	kml: 'nav.kml',
	heritageDetail: 'nav.heritageDetail',
};

const roleKeyMap = {
	管理员: 'roles.admin',
	超级管理员: 'roles.superAdmin',
	看护员: 'roles.patrol',
};

const workflowKeyMap = {
	received: 'workflow.received',
	ovital_checked: 'workflow.ovitalChecked',
	site_surveyed: 'workflow.siteSurveyed',
	application_submitted: 'workflow.applicationSubmitted',
	bureau_approved: 'workflow.bureauApproved',
	replied_to_project: 'workflow.repliedToProject',
	archived: 'workflow.archived',
};

const messages = {
	app: {
		brand: '鄯善文保',
	},
	common: {
		notAvailable: '暂无',
		none: '无',
		unknown: '未知',
		notFilled: '未填写',
		notLinked: '未关联',
		loading: '加载中',
		cancel: '取消',
		search: '搜索',
	},
	nav: {
		app: '鄯善文保',
		home: '实时统计',
		patrol: '文物巡查',
		records: '巡查记录',
		my: '我的账户',
		about: '关于此软件',
		admin: '管理中心',
		kml: 'KML叠加检查',
		heritageDetail: '文物点详情',
	},
	bottomNav: {
		home: '工作台',
		patrol: '巡查上报',
		records: '巡查记录',
		admin: '管理中心',
		my: '我的账户',
	},
	roles: {
		admin: '管理员',
		superAdmin: '超级管理员',
		patrol: '看护员',
		unknown: '未知',
	},
	login: {
		usernamePlaceholder: '请输入账号',
		passwordPlaceholder: '请输入密码',
		submit: '登录',
		missingCredentials: '请输入用户名和密码',
		success: '登录成功',
		failed: '登录失败',
		serverUnavailable: '无法连接服务端',
	},
	home: {
		adminDashboard: '管理工作台',
		patrolDashboard: '巡查工作台',
		guestUser: '未登录用户',
		startPatrol: '开始巡查',
		nearestSite: '最近文物点',
		noAddress: '暂无地址',
		distanceKm: '距离 {distance} km',
		nearestAutoPicked: '已为你选取最近文物点',
		locating: '正在定位并查找最近文物点...',
		totalSites: '文物总数',
		todayInspections: '今日巡查',
		pendingProjects: '待办项目',
		features: '功能入口',
		featurePatrol: '巡查上报',
		featureRecords: '巡查记录',
		featureHeritages: '文物管理',
			featureCollectManage: '采集数据管理',
		featureProjects: '项目管理',
		featureKml: 'KML检查',
		featureMy: '我的账户',
		featureBuilding: '功能建设中',
		locationFailedName: '定位失败',
		locationFailedAddress: '请在巡查页手动选择文物点',
		noMatchedSite: '暂无匹配文物点',
		loadFailedName: '加载失败',
		checkNetwork: '请检查网络',
		loadDataFailed: '数据加载失败',
	},
	patrol: {
		heroLabel: '巡查工作区',
		notLoggedInUser: '未登录用户',
		currentRole: '当前角色：{role}',
		heroDesc: '看护员可提交巡查记录；管理员和超级管理员同时可进入管理功能。',
		locationInfo: '定位信息',
		longitude: '经度',
		latitude: '纬度',
		nearestSite: '最近文物点',
		selectedSite: '已选择文物点',
		noAddressInfo: '暂无地址信息',
		searching: '正在查找...',
		manualTitle: '手动选择巡查文物点',
		manualCopy: '定位不可用时可搜索文物点并手动选择，再继续拍照巡查。',
		manualSearchPlaceholder: '输入名称/编号/地址',
		manualNoResult: '暂无匹配文物点',
		actionTitle: '巡查操作',
		actionCopy: '拍照后会自动叠加用户、文物点、时间和经纬度水印，再上传巡查记录。',
		siteStatus: '文物点状态',
		normal: '正常',
		problem: '存在问题',
		problemRequiredPlaceholder: '请填写问题说明（必填）',
		problemOptionalPlaceholder: '可填写补充说明（选填）',
		problemHint: '状态为存在问题时，问题说明必填',
		takePhoto: '拍照并生成巡查记录',
		previewTitle: '图片预览',
		confirmUpload: '确认上传',
		locating: '正在获取...',
		unknownLocation: '未知地点',
		locationFailedManual: '定位失败，请手动选择文物点',
		locationFailedToast: '获取位置失败',
		nearbyNotFound: '未找到附近的文物点',
		nearbyFailed: '查找失败，请检查网络',
		loadingSites: '正在加载文物点...',
		noSelectableSites: '暂无可选文物点',
		selectPatrolSite: '请选择巡查文物点',
		noCode: '无编号',
		selectedSiteFormat: '{name}（{code}）',
		manualSelected: '手动选择',
		manualSelectedAddress: '{name}（手动选择）',
		selectedToast: '已选择：{name}',
		selectSiteFirst: '请先确定文物点',
		watermarkTime: '时间',
		watermarkUser: '用户',
		watermarkSite: '文物点',
		watermarkLocation: '地点',
		watermarkCoord: '经纬度',
		unselectedSiteName: '未选择文物点',
		watermarkFailed: '水印失败，已使用原图',
		shootPhotoFirst: '请先拍照',
		fillIssueDetails: '请填写问题说明',
		uploadSuccess: '上传成功',
		uploadFailed: '上传失败',
		uploadFailedNetwork: '上传失败，请检查网络',
	},
	records: {
		heroLabel: '巡查记录',
		title: '巡查记录',
		subtitle: '查看本人提交过的巡查记录，包含时间、文物点、巡查状态和现场照片。',
		submittedRecords: '已提交记录',
		emptyTitle: '还没有巡查记录',
		emptyCopy: '完成一次巡查并上传后，记录会显示在这里。',
		normal: '正常',
		abnormal: '异常',
		issueLabel: '问题说明：{detail}',
		coordLabel: '坐标：{longitude}，{latitude}',
		loadFailed: '记录加载失败',
	},
	my: {
		heroLabel: '我的账户',
		title: '我的',
		subtitle: '账号信息与安全设置',
		fullName: '姓名',
		username: '用户名',
		role: '角色',
		changePassword: '修改密码',
		currentPassword: '当前密码',
		newPassword: '新密码（至少6位）',
		confirmPassword: '确认新密码',
		saving: '提交中...',
		saveNewPassword: '保存新密码',
		logout: '退出账号',
		loadMe: '加载中',
		fillPasswordInfo: '请完整填写密码信息',
		newPasswordMin: '新密码至少6位',
		passwordMismatch: '两次输入的新密码不一致',
		passwordSuccess: '密码修改成功',
		passwordFailed: '密码修改失败',
		loggedOut: '已退出账号',
		aboutSoftware: '关于此软件',
		aboutSoftwareDesc: '查看作者、版本信息与使用说明',
		openAboutSoftware: '打开关于页面',
		openAboutFailed: '打开关于页面失败',
	},
	about: {
		heroLabel: '关于软件',
		title: '关于此软件',
		subtitle: '系统信息与使用说明',
		authorLabel: '作者',
		authorValue: '北辰',
		contactLabel: '联系方式',
		contactValue: '如有建议或者报错可联系：\n手机：13899665458\n邮箱：w1443469207@163.com',
		versionLabel: '版本',
		versionValue: '1.0.0',
		noteLabel: '添加说明',
		noteValue: '该软件仅供内部使用',
	},
	admin: {
		heroLabel: '管理控制台',
		title: '管理中心',
		subtitle: '管理员和超级管理员可查看全部文物点详情、跟踪用地项目审批并进入 KML 叠加检查。',
		tabHeritages: '文物点数据',
		tabProjects: '项目管理',
		tabTools: '工具入口',
		allHeritages: '全部文物点',
		searchHeritagePlaceholder: '输入名称/编号/地址关键词',
		allCategoriesOption: '全部类型',
		resetFilters: '重置',
		filterResultSummary: '找到 {count} 条 · 第 {page} 页',
		noHeritageMatched: '暂无匹配文物点',
		recordCount: '共 {count} 条',
		sipCode: '四普编号：{value}',
		categoryLevel: '类别：{category} | 级别：{level}',
		address: '地址：{value}',
		coordinates: '坐标：{longitude}, {latitude}',
		prevPage: '上一页',
		nextPage: '下一页',
		pageInfo: '第 {page} / {total} 页',
		projectsTitle: '用地项目审批',
		searchProjectPlaceholder: '项目名称/企业/复函号',
		allStatusOption: '全部状态',
		projectCompany: '企业单位：{value}',
		projectDates: '来函：{incoming} | 收文：{receive}',
		projectOverlap: '涉及文物 {count} 处：{names}',
		projectOverlapBadge: '涉及文物 {count} 处',
		projectNoOverlap: '未涉及文物',
		projectNotChecked: '尚未空间核验',
		projectReply: '最终复函号：{value}',
		projectUpdatedAt: '更新于 {value}',
		projectSummary: '共 {total} 项 · 在办 {inProgress} · 已归档 {archived} · 涉及文物 {overlap}',
		noProjectMatched: '暂无用地项目',
		openProjectOnline: '在线办理',
		openProjectListOnline: '在线新建/管理',
		viewHeritageDetail: '查看详情',
		kmlTitle: 'KML 叠加检查',
		kmlDesc: '上传用地范围 KML，与文物保护范围叠加比对',
		headerSubtitle: '文物点 · 用地项目 · 业务工具',
		fieldTools: '现场工具',
		collectTitle: '四普现场数据采集',
		collectDesc: '现场登记不可移动文物，支持 GPS 定位与照片水印',
		myCollectRecords: '我的采集',
		startCollect: '开始采集',
		onlineTools: '在线系统',
		collectManageTitle: '采集数据管理',
		patrolManageTitle: '巡查管理',
		patrolManageDesc: '批量分配乡镇与文物点、设置巡查周期、查看到期任务（需联网）',
		collectManageDesc: '在线查看、审核与导出采集登记表',
		projectOnlineTitle: '用地项目办理',
		projectOnlineDesc: '新建项目、上传材料、办理审批流程',
		onlineTip: '在线系统页面在应用内浏览器中打开，已自动登录；点击“关闭”返回 App。',
		projectUnit: '项目单位：{value}',
		relatedSite: '关联文物：{value}',
		conclusion: '结论：{value}',
		editProjectInfo: '编辑项目信息',
		editProjectTitle: '编辑项目：{name}',
		projectNamePlaceholder: '项目名称',
		projectUnitPlaceholder: '项目单位',
		currentStatus: '当前状态：{value}',
		selectStatus: '请选择',
		constructionContentPlaceholder: '工程建设内容与地址',
		projectScalePlaceholder: '项目规模',
		projectCoordinatesPlaceholder: '项目选址经纬度坐标文本',
		projectLongitudePlaceholder: '项目经度',
		projectLatitudePlaceholder: '项目纬度',
		surveyConclusionPlaceholder: '勘察结论',
		remarksPlaceholder: '备注',
		saveChanges: '保存修改',
		openKml: '打开 KML 叠加检查',
		noAdminPermission: '无管理员权限',
		adminDataLoadFailed: '管理员数据加载失败',
		loadingHeritages: '加载文物点中',
		loadingProjects: '加载项目中',
		projectUpdated: '项目已更新',
		saveFailed: '保存失败',
		toolAddressMissing: '未获取到工具地址',
		openFailed: '打开失败',
	},
	workflow: {
		received: '已接收查询函',
		ovitalChecked: '奥维查询完成',
		siteSurveyed: '现场勘察完成',
		applicationSubmitted: '已上报市文物局',
		bureauApproved: '市局审批完成',
		repliedToProject: '已回函项目方',
		archived: '归档完成',
	},
	kml: {
		heroLabel: '空间工具',
		title: 'KML 叠加检查',
		subtitle: '在在线系统中上传 KML、与文物保护范围叠加比对，App 会自动登录。',
		webSubtitle: '在线系统页面，App 已自动桥接登录。',
		headerSubtitle: '在线系统 · 空间叠加分析',
		introTitle: '用地范围与文物点叠加检查',
		locationTitle: '当前位置',
		locationReady: '已定位',
		locationNone: '未定位',
		locationHint: '打开后将在地图中标出您的当前位置',
		refreshLocation: '重新定位',
		openButton: '打开 KML 叠加检查',
		opening: '正在打开…',
		openTip: '页面将在应用内浏览器中打开，点击顶部“关闭”即可返回 App。',
		showCurrentLocation: '显示当前位置',
		locating: '定位中',
		locationUpdated: '已刷新当前定位',
		locationFailed: '定位失败，请检查定位权限和GPS',
		currentLocationPrefix: '当前位置',
	},
	heritageDetail: {
		loading: '加载详情中',
		loadFailed: '详情加载失败',
		retry: '重新加载',
		surveyCode: '采集编号',
		previousCode: '历史编号',
		collectedAt: '采集时间',
		notRegistered: '该文物点尚未关联采集登记表，仅显示基础档案信息。',
		boundaryCount: '共 {count} 个坐标点',
		photosTitle: '七、现场照片',
		coverTag: '封面',
		signTitle: '采集与审核',
		footerTitle: '填表说明',
		openOnline: '在线系统打开',
		copyCoords: '复制坐标',
		copied: '已复制',
		openMap: '地图导航',
	},
};

function getMessageValue(key) {
	const segments = key.split('.');
	let current = messages;

	for (let i = 0; i < segments.length; i += 1) {
		if (!current || typeof current !== 'object') {
			return '';
		}
		current = current[segments[i]];
	}

	return current;
}

function formatMessage(template, params) {
	if (typeof template !== 'string') {
		return template;
	}

	return template.replace(/\{(\w+)\}/g, (match, token) => {
		if (params && Object.prototype.hasOwnProperty.call(params, token)) {
			return params[token];
		}
		return match;
	});
}

export function t(key, params = {}) {
	const value = getMessageValue(key);
	if (value !== undefined && value !== '') {
		return formatMessage(value, params);
	}
	return key;
}

export function getPageTitle(pageKey) {
	const titleKey = pageTitleKeys[pageKey] || 'nav.app';
	return t(titleKey);
}

export function getRoleLabel(role) {
	if (!role) {
		return t('roles.unknown');
	}
	const roleKey = roleKeyMap[role];
	if (roleKey) {
		return t(roleKey);
	}
	return role;
}

export function getWorkflowLabel(status) {
	const workflowKey = workflowKeyMap[status];
	if (workflowKey) {
		return t(workflowKey);
	}
	return status || '';
}
