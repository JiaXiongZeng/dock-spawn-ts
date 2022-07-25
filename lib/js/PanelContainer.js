import { Utils } from "./Utils.js";
import { UndockInitiator } from "./UndockInitiator.js";
import { ContainerType } from "./ContainerType.js";
import { EventHandler } from "./EventHandler.js";
import { PanelType } from "./enums/PanelType.js";
/**
 * This dock container wraps the specified element on a panel frame with a title bar and close button
 */
export class PanelContainer {
    constructor(elementContent, dockManager, title, panelType, hideCloseButton, hideMaximizeButton) {
        if (!title)
            title = 'Panel';
        if (!panelType)
            panelType = PanelType.panel;
        this.panelType = panelType;
        this.elementContent = Object.assign(elementContent, { _dockSpawnPanelContainer: this });
        this.dockManager = dockManager;
        this.title = title;
        this.containerType = ContainerType.panel;
        this.icon = null;
        this.minimumAllowedChildNodes = 0;
        this._floatingDialog = undefined;
        this.isDialog = false;
        //這個參數可以控制Panel能不能Undock
        this._canUndock = dockManager._undockEnabled;
        this.eventListeners = [];
        this._hideCloseButton = hideCloseButton;
        //家雄加
        this._hideMaximizeButton = hideMaximizeButton;
        //預設非最大化
        this.isMaximized = false;
        this._initialize();
    }
    canUndock(state) {
        this._canUndock = state;
        this.undockInitiator.enabled = state;
        this.eventListeners.forEach((listener) => {
            if (listener.onDockEnabled) {
                listener.onDockEnabled({ self: this, state: state });
            }
        });
    }
    addListener(listener) {
        this.eventListeners.push(listener);
    }
    removeListener(listener) {
        this.eventListeners.splice(this.eventListeners.indexOf(listener), 1);
    }
    get floatingDialog() {
        return this._floatingDialog;
    }
    set floatingDialog(value) {
        this._floatingDialog = value;
        let canUndock = (this._floatingDialog === undefined);
        this.undockInitiator.enabled = canUndock;
    }
    static loadFromState(state, dockManager) {
        let elementName = state.element;
        let elementContent = document.getElementById(elementName);
        if (elementContent === null) {
            return null;
        }
        let ret = new PanelContainer(elementContent, dockManager);
        ret.loadState(state);
        return ret;
    }
    saveState(state) {
        state.element = this.elementContent.id;
        state.width = this.width;
        state.height = this.height;
        state.canUndock = this._canUndock;
        state.hideCloseButton = this._hideCloseButton;
        //家雄加
        state.hideMaximizeButton = this._hideCloseButton;
        state.panelType = this.panelType;
    }
    loadState(state) {
        this.width = state.width;
        this.height = state.height;
        this.state = { width: state.width, height: state.height };
        this.canUndock(state.canUndock);
        this.hideCloseButton(state.hideCloseButton);
        //家雄加
        this.hideMaximizeButton(state.hideMaximizeButton);
        this.panelType = state.panelType;
    }
    setActiveChild( /*child*/) {
    }
    get containerElement() {
        return this.elementPanel;
    }
    grayOut(show) {
        if (!show && this._grayOut) {
            this.elementContentWrapper.removeChild(this._grayOut);
            this.elementButtonClose.style.display = this._hideCloseButton ? 'none' : 'block';
            this._grayOut = null;
            if (!this._hideCloseButton) {
                this.eventListeners.forEach((listener) => {
                    if (listener.onHideCloseButton) {
                        listener.onHideCloseButton({ self: this, state: this._hideCloseButton });
                    }
                });
            }
            //家雄加
            this.elementButtonMaximize.style.display = this._hideMaximizeButton ? 'none' : 'block';
            if (!this._hideMaximizeButton) {
                this.eventListeners.forEach((listener) => {
                    if (listener.onHideMaximizeButton) {
                        listener.onHideMaximizeButton({ self: this, state: this._hideMaximizeButton });
                    }
                });
            }
        }
        else if (show && !this._grayOut) {
            this._grayOut = document.createElement('div');
            this._grayOut.className = 'panel-grayout';
            this.elementButtonClose.style.display = 'none';
            this.elementContentWrapper.appendChild(this._grayOut);
            this.eventListeners.forEach((listener) => {
                if (listener.onHideCloseButton) {
                    listener.onHideCloseButton({ self: this, state: true });
                }
            });
            //家雄加
            this.elementButtonMaximize.style.display = 'none';
            this.eventListeners.forEach((listener) => {
                if (listener.onHideMaximizeButton) {
                    listener.onHideMaximizeButton({ self: this, state: true });
                }
            });
        }
    }
    _initialize() {
        this.name = Utils.getNextId('panel_');
        this.elementPanel = document.createElement('div');
        this.elementPanel.tabIndex = 0;
        this.elementTitle = document.createElement('div');
        this.elementTitleText = document.createElement('div');
        this.elementContentHost = document.createElement('div');
        this.elementButtonClose = document.createElement('div');
        //家雄加入
        this.elementButtonMaximize = document.createElement('div');
        this.elementPanel.appendChild(this.elementTitle);
        this.elementTitle.appendChild(this.elementTitleText);
        this.elementTitle.appendChild(this.elementButtonClose);
        //家雄加入
        this.elementTitle.appendChild(this.elementButtonMaximize);
        this.elementButtonClose.classList.add('panel-titlebar-button-close');
        this.elementButtonClose.style.display = this._hideCloseButton ? 'none' : 'block';
        //家雄加入
        this.elementButtonMaximize.classList.add('panel-titlebar-button-maximize');
        this.elementButtonMaximize.style.display = this._hideMaximizeButton ? 'none' : 'block';
        this.elementPanel.appendChild(this.elementContentHost);
        this.elementPanel.classList.add('panel-base');
        this.elementTitle.classList.add('panel-titlebar');
        this.elementTitle.classList.add('disable-selection');
        this.elementTitleText.classList.add('panel-titlebar-text');
        this.elementContentHost.classList.add('panel-content');
        // set the size of the dialog elements based on the panel's size
        let panelWidth = this.elementContent.clientWidth;
        let panelHeight = this.elementContent.clientHeight;
        let titleHeight = this.elementTitle.clientHeight;
        this._setPanelDimensions(panelWidth, panelHeight + titleHeight);
        if (!this._hideCloseButton) {
            this.closeButtonClickedHandler =
                new EventHandler(this.elementButtonClose, 'mousedown', this.onCloseButtonClicked.bind(this));
            this.closeButtonTouchedHandler =
                new EventHandler(this.elementButtonClose, 'touchstart', this.onCloseButtonClicked.bind(this));
        }
        //家雄加入
        if (!this._hideMaximizeButton) {
            this.maximizeButtonClickedHandler =
                new EventHandler(this.elementButtonMaximize, 'mousedown', this.onMaximizeButtonClicked.bind(this));
            this.maximizeButtonTouchedHandler =
                new EventHandler(this.elementButtonMaximize, 'touchstart', this.onMaximizeButtonClicked.bind(this));
        }
        this.elementContentWrapper = document.createElement("div");
        this.elementContentWrapper.classList.add('panel-content-wrapper');
        this.elementContentWrapper.appendChild(this.elementContent);
        Utils.removeNode(this.elementContentWrapper);
        this.elementContentHost.appendChild(this.elementContentWrapper);
        // Extract the title from the content element's attribute
        let contentTitle = this.elementContent.dataset.panelCaption;
        let contentIcon = this.elementContent.dataset.panelIcon;
        if (contentTitle)
            this.title = contentTitle;
        if (contentIcon)
            this.icon = contentIcon;
        this._updateTitle();
        this.undockInitiator = new UndockInitiator(this.elementTitle, this.performUndockToDialog.bind(this));
        delete this.floatingDialog;
        this.mouseDownHandler = new EventHandler(this.elementPanel, 'mousedown', this.onMouseDown.bind(this));
        this.touchDownHandler = new EventHandler(this.elementPanel, 'touchstart', this.onMouseDown.bind(this));
        this.elementContent.removeAttribute("hidden");
    }
    onMouseDown() {
        this.dockManager.activePanel = this;
    }
    hideCloseButton(state) {
        this._hideCloseButton = state;
        this.elementButtonClose.style.display = state ? 'none' : 'block';
        this.eventListeners.forEach((listener) => {
            if (listener.onHideCloseButton) {
                listener.onHideCloseButton({ self: this, state: state });
            }
        });
    }
    //家雄加入
    hideMaximizeButton(state) {
        this._hideMaximizeButton = state;
        this.elementButtonMaximize.style.display = state ? 'none' : 'block';
        this.eventListeners.forEach((listener) => {
            if (listener.onHideMaximizeButton) {
                listener.onHideMaximizeButton({ self: this, state: state });
            }
        });
    }
    destroy() {
        if (this.mouseDownHandler) {
            this.mouseDownHandler.cancel();
            delete this.mouseDownHandler;
        }
        if (this.touchDownHandler) {
            this.touchDownHandler.cancel();
            delete this.touchDownHandler;
        }
        Utils.removeNode(this.elementPanel);
        if (this.closeButtonClickedHandler) {
            this.closeButtonClickedHandler.cancel();
            delete this.closeButtonClickedHandler;
        }
        if (this.closeButtonTouchedHandler) {
            this.closeButtonTouchedHandler.cancel();
            delete this.closeButtonTouchedHandler;
        }
    }
    /**
     * Undocks the panel and and converts it to a dialog box
     */
    performUndockToDialog(e, dragOffset) {
        this.isDialog = true;
        this.undockInitiator.enabled = false;
        this.elementContentWrapper.style.display = "block";
        this.elementPanel.style.position = "";
        return this.dockManager.requestUndockToDialog(this, e, dragOffset);
    }
    /**
    * Closes the panel
    */
    performClose() {
        this.isDialog = true;
        this.undockInitiator.enabled = false;
        this.elementContentWrapper.style.display = "block";
        this.elementPanel.style.position = "";
        this.dockManager.requestClose(this);
    }
    /**
     * Undocks the container and from the layout hierarchy
     * The container would be removed from the DOM
     */
    performUndock() {
        this.undockInitiator.enabled = false;
        this.dockManager.requestUndock(this);
    }
    ;
    prepareForDocking() {
        this.isDialog = false;
        this.undockInitiator.enabled = this._canUndock;
    }
    get width() {
        return this._cachedWidth;
    }
    set width(value) {
        if (value !== this._cachedWidth) {
            this._cachedWidth = value;
            this.elementPanel.style.width = value + 'px';
        }
    }
    get height() {
        return this._cachedHeight;
    }
    set height(value) {
        if (value !== this._cachedHeight) {
            this._cachedHeight = value;
            this.elementPanel.style.height = value + 'px';
        }
    }
    resize(width, height) {
        // if (this._cachedWidth === width && this._cachedHeight === height)
        // {
        //     // Already in the desired size
        //     return;
        // }
        this._setPanelDimensions(width, height);
        this._cachedWidth = width;
        this._cachedHeight = height;
        try {
            if (this.elementContent != undefined && (typeof this.elementContent.resizeHandler == 'function'))
                this.elementContent.resizeHandler(width, height - this.elementTitle.clientHeight);
        }
        catch (err) {
            console.log("error calling resizeHandler:", err, " elt:", this.elementContent);
        }
    }
    _setPanelDimensions(width, height) {
        this.elementTitle.style.width = width + 'px';
        this.elementContentHost.style.width = width + 'px';
        this.elementContent.style.width = width + 'px';
        this.elementPanel.style.width = width + 'px';
        let titleBarHeight = this.elementTitle.clientHeight;
        let contentHeight = height - titleBarHeight;
        this.elementContentHost.style.height = contentHeight + 'px';
        this.elementContent.style.height = contentHeight + 'px';
        this.elementPanel.style.height = height + 'px';
    }
    setTitle(title) {
        this.title = title;
        this._updateTitle();
        if (this.onTitleChanged)
            this.onTitleChanged(this, title);
    }
    setTitleIcon(icon) {
        this.icon = icon;
        this._updateTitle();
        if (this.onTitleChanged)
            this.onTitleChanged(this, this.title);
    }
    setHasChanges(changes) {
        this.hasChanges = changes;
        this._updateTitle();
        if (changes) {
            this.elementTitleText.classList.add('panel-has-changes');
        }
        else {
            this.elementTitleText.classList.remove('panel-has-changes');
        }
        if (this.onTitleChanged)
            this.onTitleChanged(this, this.title);
    }
    setCloseIconTemplate(closeIconTemplate) {
        this.elementButtonClose.innerHTML = closeIconTemplate;
    }
    _updateTitle() {
        if (this.icon !== null) {
            this.elementTitleText.innerHTML = '<img class="panel-titlebar-icon" src="' + this.icon + '"><span>' + this.title + '</span>';
            return;
        }
        this.elementTitleText.innerHTML = this.title;
    }
    getRawTitle() {
        return this.elementTitleText.innerHTML;
    }
    performLayout(children, relayoutEvenIfEqual) {
    }
    onCloseButtonClicked(e) {
        e.preventDefault();
        e.stopPropagation();
        this.close();
        //家雄加入
        if (this.isMaximized) {
            this.shadowPanel.close();
        }
    }
    //家雄加
    onPanelDock(node) {
        //家雄加
        this.dockAt = node;
        if (this.isMaximized) {
            this.elementButtonMaximize.classList.remove('panel-titlebar-button-minimize');
            this.elementButtonMaximize.classList.add('panel-titlebar-button-maximize');
            this.isMaximized = false;
            if (!this._isMaximizeButtonClick && this.shadowPanel) {
                this.shadowPanel.close();
                this.tabPage.host.setActiveTab(this);
            }
        }
    }
    //家雄加
    onMaximizeButtonClicked(e) {
        e.preventDefault();
        e.stopPropagation();
        this._isMaximizeButtonClick = true;
        let docM = this.dockManager;
        if (!this.isMaximized) {
            //紀錄之前是否為Dialog或Panel
            this._previousIsDialog = this.isDialog;
            //要記錄舊的長寬，之後變成Dialog時才不會變全Window Size
            this._previousWidth = this.width;
            this._previousHeight = this.height;
            if (this.isDialog) {
                //若為Dialog則記錄原本的位置
                this._previousPositon = this._floatingDialog.getPosition();
                //To full screen
                this._floatingDialog.setPosition(0, 0);
            }
            else {
                let el = document.createElement('div');
                this.shadowPanel = new PanelContainer(el, docM, this.title + "(poped up)", PanelType.panel, true, true);
                this.shadowPanel.canUndock(false);
                this.dockAt = docM.dockFill(this.dockAt, this.shadowPanel);
                this.tabPage.host.setActiveTab(this);
                //To full screen
                docM.floatDialog(this, 0, 0);
            }
            //Resize到全Window Size
            this.resize(window.innerWidth, window.innerHeight);
            this.elementButtonMaximize.classList.remove('panel-titlebar-button-maximize');
            this.elementButtonMaximize.classList.add('panel-titlebar-button-minimize');
            this.isMaximized = true;
        }
        else {
            if (this.isDialog) {
                //還原成先前的大小
                this.resize(this._previousWidth, this._previousHeight);
                if (this._previousIsDialog) {
                    //若先前為Dialog則賦歸為原本的位置
                    this._floatingDialog.setPosition(this._previousPositon.x, this._previousPositon.y);
                }
                else {
                    this.dockAt = docM.dockDialogFill(this.dockAt, this._floatingDialog);
                    //要先Active ShadowPanel後才能Close
                    this.tabPage.host.setActiveTab(this.shadowPanel);
                    //要Close前記得要先Active原本的Panel不然會抓不到高度內容會顯示不出來
                    this.tabPage.host.setActiveTab(this);
                    this.shadowPanel.close();
                }
                this.elementButtonMaximize.classList.remove('panel-titlebar-button-minimize');
                this.elementButtonMaximize.classList.add('panel-titlebar-button-maximize');
                this.isMaximized = false;
            }
        }
        this.dockManager.notifyOnMaximizePanel(this);
        this._isMaximizeButtonClick = false;
    }
    async close() {
        let close = true;
        if (this.closePanelContainerCallback)
            close = await this.closePanelContainerCallback(this);
        else if (this.dockManager.closePanelContainerCallback)
            close = await this.dockManager.closePanelContainerCallback(this);
        if (close) {
            if (this.isDialog) {
                if (this.floatingDialog) {
                    //this.floatingDialog.hide();
                    this.floatingDialog.close(); // fires onClose notification
                }
            }
            else {
                this.performClose();
                this.dockManager.notifyOnClosePanel(this);
            }
        }
    }
}
//# sourceMappingURL=PanelContainer.js.map