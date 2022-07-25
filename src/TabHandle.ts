import { TabPage } from "./TabPage.js";
import { PanelContainer } from "./PanelContainer.js";
import { UndockInitiator } from "./UndockInitiator.js";
import { EventHandler } from "./EventHandler.js";
import { Utils } from "./Utils.js";
import { PanelType } from "./enums/PanelType.js";
import { DockNode } from "./DockNode.js";

/**
 * A tab handle represents the tab button on the tab strip
 */
export class TabHandle {
    parent: TabPage;
    elementBase: HTMLDivElement;
    elementText: HTMLDivElement;
    elementCloseButton: HTMLDivElement;
    elementMaximizeButton: HTMLDivElement;
    undockInitiator: UndockInitiator;
    mouseDownHandler: EventHandler;
    touchDownHandler: EventHandler;
    closeButtonHandler: EventHandler;
    closeButtonTouchHandler: EventHandler;
    auxClickHandler: EventHandler;
    contextMenuHandler: EventHandler;
    //家雄加
    maximizeButtonHandler: EventHandler;
    maximizeButtonTouchHandler: EventHandler;
    doubleClickHandler: EventHandler;

    zIndexCounter: number;
    mouseMoveHandler: EventHandler;
    touchMoveHandler: EventHandler;
    mouseUpHandler: EventHandler;
    touchUpHandler: EventHandler;
    stargDragPosition: any;
    dragged: boolean;
    eventListeners: any[];
    undockListener: { 
        onDockEnabled: (e: any) => void; 
        onHideCloseButton: (e: any) => void; 
        //家雄加
        onHideMaximizeButton: (e: any) => void; 
    };

    prev: number;
    current: number;
    direction: number;
    _ctxMenu: HTMLDivElement;
    _windowsContextMenuCloseBound: any;

    constructor(parent: TabPage) {
        this.parent = parent;
        let undockHandler = this._performUndock.bind(this);
        this.elementBase = document.createElement('div');
        this.elementText = document.createElement('div');
        this.elementCloseButton = document.createElement('div');
        //家雄加
        this.elementMaximizeButton = document.createElement('div');

        this.elementBase.classList.add('dockspan-tab-handle');
        this.elementBase.classList.add('disable-selection'); // Disable text selection
        this.elementText.classList.add('dockspan-tab-handle-text');
        this.elementCloseButton.classList.add('dockspan-tab-handle-close-button');

        //家雄加
        this.elementMaximizeButton.classList.add('dockspan-tab-handle-maximize-button');
        this.elementBase.appendChild(this.elementText);

        //獨立成一個變數因為後面會用到
        let thisPanel = this.parent.container as PanelContainer;
        if (this.parent.host.displayCloseButton)
            this.elementBase.appendChild(this.elementCloseButton);
        if (thisPanel._hideCloseButton || thisPanel._grayOut)
            this.elementCloseButton.style.display = 'none';

        //家雄加 (有一些情況下會跟CloseButton一起不顯示)
        if (this.parent.host.displayMaximizeButton)
            this.elementBase.appendChild(this.elementMaximizeButton);
        if(thisPanel._hideMaximizeButton || thisPanel._grayOut)
            this.elementMaximizeButton.style.display = 'none';

        this.parent.host.tabListElement.appendChild(this.elementBase);

        let panel = parent.container as PanelContainer;
        let title = panel.getRawTitle();
        this.undockListener = {
            onDockEnabled: (e) => { this.undockEnabled(e.state); },
            onHideCloseButton: (e) => { this.hideCloseButton(e.state); },
            //家雄加
            onHideMaximizeButton: (e) => { this.hideMaximizeButton(e.state); },
        };
        this.eventListeners = [];
        panel.addListener(this.undockListener);

        this.elementText.innerHTML = title;
        this.elementText.title = this.elementText.innerText;

        this._bringToFront(this.elementBase);

        this.undockInitiator = new UndockInitiator(this.elementBase, undockHandler);
        //家雄修正Bug，要看Panel的設定
        this.undockInitiator.enabled = (<PanelContainer>this.parent.container)._canUndock;
        this.mouseDownHandler = new EventHandler(this.elementBase, 'mousedown', this.onMouseDown.bind(this));
        this.touchDownHandler = new EventHandler(this.elementBase, 'touchstart', this.onMouseDown.bind(this), { passive: false });
        this.closeButtonHandler = new EventHandler(this.elementCloseButton, 'click', this.onCloseButtonClicked.bind(this));
        this.closeButtonTouchHandler = new EventHandler(this.elementCloseButton, 'touchstart', this.onCloseButtonClicked.bind(this));
        this.auxClickHandler = new EventHandler(this.elementBase, 'auxclick', this.onCloseButtonClicked.bind(this));
        this.contextMenuHandler = new EventHandler(this.elementBase, 'contextmenu', this.oncontextMenuClicked.bind(this));
        
        //家雄加
        this.maximizeButtonHandler = new EventHandler(this.elementMaximizeButton, 'click', this.onMaximizeButtonClicked.bind(this));
        this.maximizeButtonTouchHandler = new EventHandler(this.elementMaximizeButton, 'touchstart', this.onMaximizeButtonClicked.bind(this));

        //家雄加
        this.doubleClickHandler = new EventHandler(this.elementBase, 'dblclick', this.onDoubleClicked.bind(this));

        this.zIndexCounter = parent.host.dockManager.zIndexTabHandle;
    }

    addListener(listener) {
        this.eventListeners.push(listener);
    }

    removeListener(listener) {
        this.eventListeners.splice(this.eventListeners.indexOf(listener), 1);
    }

    undockEnabled(state: boolean) {
        this.undockInitiator.enabled = state;
    }

    static createContextMenuContentCallback = (tabHandle: TabHandle, contextMenuContainer: HTMLDivElement, documentMangerNodes: DockNode[]) => {
        let btnCloseAll = document.createElement('div');
        btnCloseAll.innerText = 'Close all documents';
        contextMenuContainer.append(btnCloseAll);

        let btnCloseAllButThis = document.createElement('div');
        btnCloseAllButThis.innerText = 'Close all documents but this';
        contextMenuContainer.append(btnCloseAllButThis);

        btnCloseAll.onclick = () => {
            let length = documentMangerNodes.length;
            for (let i = length - 1; i >= 0; i--) {
                let panel = (<PanelContainer>documentMangerNodes[i].container);
                if (panel.panelType == PanelType.document)
                    panel.close();
            }
            tabHandle.closeContextMenu();
        };

        btnCloseAllButThis.onclick = () => {
            let length = documentMangerNodes.length;
            for (let i = length - 1; i >= 0; i--) {
                let panel = (<PanelContainer>documentMangerNodes[i].container);
                if (tabHandle.parent.container != panel && panel.panelType == PanelType.document)
                    panel.close();
            }
            tabHandle.closeContextMenu();
        };
    }

    oncontextMenuClicked(e: MouseEvent) {
        e.preventDefault();

        if (!this._ctxMenu && TabHandle.createContextMenuContentCallback) {
            //家雄修正Bug，Panel Type不需要出現ContextMenu
            let panel = (<PanelContainer>this.parent.container);
            if(panel.panelType == PanelType.document){
                this._ctxMenu = document.createElement('div');
                this._ctxMenu.className = 'dockspab-tab-handle-context-menu';

                TabHandle.createContextMenuContentCallback(this, this._ctxMenu, this.parent.container.dockManager.context.model.documentManagerNode.children);

                this._ctxMenu.style.left = e.pageX + "px";
                this._ctxMenu.style.top = e.pageY + "px";
                document.body.appendChild(this._ctxMenu);
                this._windowsContextMenuCloseBound = this.windowsContextMenuClose.bind(this)
                window.addEventListener('mouseup', this._windowsContextMenuCloseBound);
            }
        } else {
            this.closeContextMenu();
        }
    }

    closeContextMenu() {
        if (this._ctxMenu) {
            document.body.removeChild(this._ctxMenu);
            delete this._ctxMenu;
            window.removeEventListener('mouseup', this._windowsContextMenuCloseBound);
        }
    }

    windowsContextMenuClose(e: Event) {
        let cp = e.composedPath();
        for (let i in cp) {
            let el = cp[i];
            if (el == this._ctxMenu)
                return;
        }
        this.closeContextMenu();
    }

    onMouseDown(e) {
        e.preventDefault();

        this.parent.onSelected();

        if (this.mouseMoveHandler) {
            this.mouseMoveHandler.cancel();
            delete this.mouseMoveHandler;
        }
        if (this.touchMoveHandler) {
            this.touchMoveHandler.cancel();
            delete this.touchMoveHandler;
        }
        if (this.mouseUpHandler) {
            this.mouseUpHandler.cancel();
            delete this.mouseUpHandler;
        }
        if (this.touchUpHandler) {
            this.touchUpHandler.cancel();
            delete this.touchUpHandler;
        }
        this.stargDragPosition = e.clientX;
        this.mouseMoveHandler = new EventHandler(window, 'mousemove', this.onMouseMove.bind(this));
        this.touchMoveHandler = new EventHandler(window, 'touchmove', this.onMouseMove.bind(this), { passive: false });
        this.mouseUpHandler = new EventHandler(window, 'mouseup', this.onMouseUp.bind(this));
        this.touchUpHandler = new EventHandler(window, 'touchend', this.onMouseUp.bind(this));
    }

    onMouseUp(e) {
        if (this.elementBase) {
            this.elementBase.classList.remove('dockspan-tab-handle-dragged');
        }
        this.dragged = false;
        if (this.mouseMoveHandler)
            this.mouseMoveHandler.cancel();
        if (this.touchMoveHandler)
            this.touchMoveHandler.cancel();
        if (this.mouseUpHandler)
            this.mouseUpHandler.cancel();
        if (this.touchUpHandler)
            this.touchUpHandler.cancel();
        delete this.mouseMoveHandler;
        delete this.touchMoveHandler;
        delete this.mouseUpHandler;
        delete this.touchUpHandler;
    }

    moveTabEvent(that, state) {
        that.eventListeners.forEach((listener) => {
            if (listener.onMoveTab) {
                listener.onMoveTab({ self: that, state: state });
            }
        });
    }

    onMouseMove(e) {
        e.preventDefault();

        if (Math.abs(this.stargDragPosition - e.clientX) < 10)
            return;
        if (this.elementBase != null) { //Todo: because of this is null, we need to drag 2 times, needs fix
            this.elementBase.classList.add('dockspan-tab-handle-dragged');
            this.dragged = true;
            this.prev = this.current;
            this.current = e.clientX;
            this.direction = this.current - this.prev;
            let tabRect = this.elementBase.getBoundingClientRect();
            let event = this.direction < 0
                ? { state: 'left', bound: tabRect.left, rect: tabRect }
                : { state: 'right', bound: tabRect.right, rect: tabRect };
            if ((e.clientX < tabRect.left && this.direction < 0) || (e.clientX > tabRect.left + tabRect.width && this.direction > 0))
                this.moveTabEvent(this, event.state);
        }
    }

    hideCloseButton(state) {
        this.elementCloseButton.style.display = state ? 'none' : 'block';
    }

    //家雄加
    hideMaximizeButton(state){
        this.elementMaximizeButton.style.display = state ? 'none' : 'block';
    }

    //家雄加
    onDoubleClicked(e: MouseEvent){
        e.preventDefault();
        if (e.button !== 2) {
            //雙擊可以放大視窗
            let panel = this.parent.container as PanelContainer;
            if(panel._canUndock && !panel._hideMaximizeButton){
                panel.onMaximizeButtonClicked(e);
            }
        }
    }

    updateTitle() {
        if (this.parent.container instanceof PanelContainer) {
            let panel = this.parent.container;
            let title = panel.getRawTitle();
            this.elementText.innerHTML = title;
        }
    }

    destroy() {
        let panel = this.parent.container as PanelContainer;
        panel.removeListener(this.undockListener);

        this.mouseDownHandler.cancel();
        this.touchDownHandler.cancel();
        this.closeButtonHandler.cancel();
        this.closeButtonTouchHandler.cancel();
        this.auxClickHandler.cancel();

        if (this.mouseMoveHandler) {
            this.mouseMoveHandler.cancel();
        }
        if (this.touchMoveHandler) {
            this.touchMoveHandler.cancel();
        }
        if (this.mouseUpHandler) {
            this.mouseUpHandler.cancel();
        }
        if (this.touchUpHandler) {
            this.touchUpHandler.cancel();
        }
        if (this.contextMenuHandler) {
            this.contextMenuHandler.cancel();
        }

        Utils.removeNode(this.elementBase);
        Utils.removeNode(this.elementCloseButton);
        delete this.elementBase;
        delete this.elementCloseButton;
    }

    _performUndock(e, dragOffset) {
        if (this.parent.container.containerType === 'panel') {
            this.undockInitiator.enabled = false;
            let panel = this.parent.container as PanelContainer;
            return panel.performUndockToDialog(e, dragOffset);
        }
        else
            return null;
    }

    onCloseButtonClicked(e) {
        if (this.elementCloseButton.style.display !== 'none') {
            if (e.button !== 2) {
                // If the page contains a panel element, undock it and destroy it
                if (this.parent.container.containerType === 'panel') {
                    let panel = this.parent.container as PanelContainer;
                    panel.close();
                }
            }
        }
    }

    //家雄加
    onMaximizeButtonClicked(e){
        if(this.elementMaximizeButton.style.display !== 'none'){
            if(e.button !== 2){
                // alert("Hello WorldVVV!");
                // let docM = this.parent.container.dockManager;
                // let el = document.createElement('div');
                // let newPage = new PanelContainer(el, docM, 'Test Dlg', PanelType.document);
                // docM.dockFill(new DockNode(this.parent.container), newPage);

                let panel = this.parent.container as PanelContainer;
                panel.onMaximizeButtonClicked(e);
            }
        }
    }

    setSelected(isSelected: boolean) {
        if (isSelected)
            this.elementBase.classList.add('dockspan-tab-handle-selected');
        else {
            this.elementBase.classList.remove('dockspan-tab-handle-selected');
            this.elementBase.classList.remove('dockspan-tab-handle-active');
        }
    }

    setActive(isActive: boolean) {
        if (this.elementBase) {
            if (isActive)
                this.elementBase.classList.add('dockspan-tab-handle-active');
            else
                this.elementBase.classList.remove('dockspan-tab-handle-active');
        }
    }

    setZIndex(zIndex: number) {
        this.elementBase.style.zIndex = <string><any>zIndex;
    }

    _bringToFront(element: HTMLElement) {
        element.style.zIndex = <string><any>this.zIndexCounter;
        this.zIndexCounter++;
    }
}