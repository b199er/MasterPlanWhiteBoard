const gridCellW = 32;
const gridCellH = 32;

const enum_status = {
    nothing: 0,
    panningCam: 1,
    editting: 2,
    movingCell: 3,
    resizingCell: 4,
    selecting: 5
};

//==========================================================================
// selection Box
//==========================================================================
class selectionBox{
    constructor(boardElement){
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;

        this.element = document.createElement("div");
        this.element.className = "selectionBox";
        this.element.style.width = "50px";
        this.element.style.height = "50px";

        boardElement.appendChild(this.element);

        this.disable();
        this.disabled = true;
    }

    changeLocation(x, y){
        this.x = x;
        this.y = y;
        this.element.style.left = x + "px";
        this.element.style.top = y + "px";
    }

    changeSize(w, h){
        this.width = w;
        this.height = h;

        if(this.width < 0){
            this.element.style.left = this.x - Math.abs(w) + "px";
            this.element.style.width = Math.abs(w) + "px";
        }else{
            this.element.style.left = this.x + "px";
            this.element.style.width = Math.abs(w) + "px";
        }

        if(this.height < 0){
            this.element.style.top = this.y - Math.abs(h) + "px";
            this.element.style.height = Math.abs(h) + "px";
        }else{
            this.element.style.top = this.y + "px";
            this.element.style.height = Math.abs(h) + "px";
        }
    }

    disable(){
        this.element.style.display = 'none';
        this.disabled = true;
    }

    enable(){
        this.element.style.display = 'block';
        this.disabled = false;
    }

    getSelectionBoxBounds() {
        let x0 = this.x;
        let y0 = this.y;
        let x1 = this.x + this.width;
        let y1 = this.y + this.height;
    
        if (x0 > x1) [x0, x1] = [x1, x0];
        if (y0 > y1) [y0, y1] = [y1, y0];
    
        return { x0, y0, x1, y1 };
    }
    
    rectanglesOverlap(ax0, ay0, ax1, ay1, bx0, by0, bx1, by1) {
        return !(ax1 <= bx0 || ax0 >= bx1 || ay1 <= by0 || ay0 >= by1);
    }
    
    cellsInSelectionBox(cells) {
        const selectedCells = [];

        const { x0: selX0, y0: selY0, x1: selX1, y1: selY1 } = this.getSelectionBoxBounds();
    
        for (const cell of cells) {
            const cellX0 = cell.x * gridCellW + cell.camX;
            const cellY0 = cell.y * gridCellH + cell.camY;
            const cellX1 = cellX0 + cell.width * gridCellW;
            const cellY1 = cellY0 + cell.height * gridCellH;
    
            if (this.rectanglesOverlap(selX0, selY0, selX1, selY1, cellX0, cellY0, cellX1, cellY1)) {
                cell.setSelected(true);
                selectedCells.push(cell);
            }else{
                cell.setSelected(false);
            }

            if(this.width < 40 && this.height < 40){
                
                cell.setSelected(false);
            }
        }

        if(this.width < 40 && this.height < 40){
                
            return [];
        }

        if(this.disabled == true){ return []; }


        return selectedCells;
        
    }
}

//==========================================================================
// Board
//==========================================================================
class Board {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.camX = 0;
        this.camY = 0;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.cells = [];
        this.selectedCells = [];
        this.camPan = true;
        this.panKeyDown = false;

        this.global_status = enum_status.nothing;

        this.selectionBox = new selectionBox(this.canvas);
        this.startSelecting = false;

        this.init();
    }

    init() {
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', () => this.onMouseUp());
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

    setStatus(status) {
        this.global_status = status;

        if (status == enum_status.panningCam) {
            this.lockAllCellEdit();
        } else {
            this.unlockAllCellEdit();
        }
    }

    lockAllCellEdit() {
        for (let i = 0; i < this.cells.length; i++) {
            this.cells[i].lockEdit();
        }
    }

    unlockAllCellEdit() {
        for (let i = 0; i < this.cells.length; i++) {
            this.cells[i].unlockEdit();
        }
    }

    onKeyDown(event) {
        if (this.global_status != enum_status.nothing) {
            return;
        }
        if (event.code === 'Space') {
            this.setStatus(enum_status.panningCam);
            this.panKeyDown = true;
            this.canvas.style.cursor = "grab";
        }
    }

    onKeyUp(event) {
        if (this.global_status == enum_status.panningCam) {
            if (event.code === 'Space') {
                this.setStatus(enum_status.nothing);
                this.panKeyDown = false;
                this.canvas.style.cursor = "default";
            }
        }
    }

    onMouseDown(event) {

        if(this.global_status != enum_status.movingCell && this.global_status != enum_status.panningCam){
            this.selectionBox.changeSize(0,0);
            this.selectedCells = this.selectionBox.cellsInSelectionBox(this.cells);
        }

        

        if(!this.panKeyDown && this.global_status == enum_status.nothing && event.target == this.canvas){
            this.setStatus(enum_status.selecting);
            this.startSelecting = true;
            this.startX = event.clientX;
            this.startY = event.clientY;
            this.selectionBox.changeSize(0,0);
            this.selectionBox.changeLocation(event.clientX,event.clientY);
            this.selectionBox.enable();
        }

        if (!this.panKeyDown) {
            return;
        }
        if (this.camPan) {
            this.isDragging = true;
            this.startX = event.clientX;
            this.startY = event.clientY;
        }
        this.canvas.style.cursor = "grabbing";
    }

    onMouseMove(event) {
        if(this.startSelecting){
            const dx = event.clientX - this.startX;
            const dy = event.clientY - this.startY;
            this.selectionBox.changeSize(dx, dy);
            this.selectedCells = this.selectionBox.cellsInSelectionBox(this.cells);
        }

        if (this.isDragging) {
            const dx = event.clientX - this.startX;
            const dy = event.clientY - this.startY;

            this.camX += dx;
            this.camY += dy;

            this.canvas.style.backgroundPosition = `${this.camX}px ${this.camY}px`;

            for (let i = 0; i < this.cells.length; i++) {
                this.cells[i].setCamCoordinates(this.camX, this.camY);
            }

            this.startX = event.clientX;
            this.startY = event.clientY;
        }
    }

    onMouseUp() {
        if(this.global_status == enum_status.selecting){
            this.setStatus(enum_status.nothing);
            this.startSelecting = false;
            this.selectionBox.disable();
        }

        this.isDragging = false;
        
        if (!this.panKeyDown) {
            return;
        }
        this.canvas.style.cursor = "grab";
        
    }

    setSelectionDistance(masterTitle){
        for (let i = 0; i < this.selectedCells.length; i++) {
            const tempCellTitle = this.selectedCells[i].titleBar;
            
            if(masterTitle != tempCellTitle){
                let disX = tempCellTitle.parentCellObj.x - masterTitle.parentCellObj.x;
                let disY = tempCellTitle.parentCellObj.y - masterTitle.parentCellObj.y;
                
                tempCellTitle.setSelectionDistance(disX, disY);
            }else{
                tempCellTitle.setSelectionDistance(0, 0);
            }
        }
    }

    moveSelection(masterTitle){
        for (let i = 0; i < this.selectedCells.length; i++) {
            const tempCellTitle = this.selectedCells[i].titleBar;
            if(masterTitle != tempCellTitle){
                console.log(masterTitle);
                tempCellTitle.moveFromOutside(masterTitle.parentCellObj.x,masterTitle.parentCellObj.y);
            }
        }
    }

    createTextCellCenter() {
        const offsetX = document.body.clientWidth / 2;
        const offsetY = document.body.clientHeight / 2;
        this.createTextCell(
            Math.floor((-this.camX + offsetX) / gridCellW),
            Math.floor((-this.camY + offsetY) / gridCellH)
        );
    }

    createTextCell(x, y) {
        this.cells.push(new Cell(x, y, this.camX, this.camY, this.canvas, this));
    }

    createFrameCellCenter() {
        const offsetX = document.body.clientWidth / 2;
        const offsetY = document.body.clientHeight / 2;
        this.createFrameCell(
            Math.floor((-this.camX + offsetX) / gridCellW),
            Math.floor((-this.camY + offsetY) / gridCellH)
        );
    }

    createFrameCell(x, y) {
        this.cells.push(new Frame(x, y, this.camX, this.camY, this.canvas, this));
    }

    preventCamPanning() {
        this.camPan = false;
        this.isDragging = false;
    }

    allowCamPanning() {
        this.camPan = true;
    }

    clear(){
        this.cells.forEach(cell => {
            cell.delete();
        });
        this.cells = [];
        this.save();
    }

    // Save method
    save() {
        const data = {
            camX: this.camX,
            camY: this.camY,
            cells: this.cells
            .filter(cell => !cell.deleted)
            .map(cell => cell.serialize())
        };
        return JSON.stringify(data);
    }

    // Load method
    load(jsonData) {
        // Clear existing cells
        this.cells.forEach(cell => {
            cell.delete();
        });
        this.cells = [];

        // Parse JSON
        const data = JSON.parse(jsonData);

        // Set camera position
        this.camX = data.camX || 0;
        this.camY = data.camY || 0;
        this.canvas.style.backgroundPosition = `${this.camX}px ${this.camY}px`;

        // Reconstruct cells
        data.cells.forEach(cellData => {
            let cell;
            if (cellData.type === 'Cell') {
                cell = new Cell(cellData.x, cellData.y, this.camX, this.camY, this.canvas, this);
            } else if (cellData.type === 'Frame') {
                cell = new Frame(cellData.x, cellData.y, this.camX, this.camY, this.canvas, this);
            }
            // Set cell properties
            cell.setSize(cellData.width, cellData.height);
            if (cell.innerDiv && cellData.innerHTML) {
                cell.innerDiv.cellInnerHTMLElement.innerHTML = cellData.innerHTML;
            }
            if (cell.titleBar && cellData.title) {
                cell.titleBar.titleText.innerHTML = cellData.title;
            }
            this.cells.push(cell);
        });

        // Update positions
        for (let i = 0; i < this.cells.length; i++) {
            this.cells[i].setCamCoordinates(this.camX, this.camY);
        }
    }
}

//==========================================================================
// Title
//==========================================================================
class CellTitleBar {
    constructor(label, parentCell, parentCellObj, boardObj) {
        this.label = label;

        this.parentCell = parentCell;
        this.parentCellObj = parentCellObj;
        this.boardObj = boardObj;
        this.createElement();
        this.parentCell.insertBefore(this.element, this.parentCell.firstChild);

        this.disX = 0;
        this.disY = 0;

        this.editTitleElement = document.createElement('div');
        this.editTitleElement.innerHTML =
            '<span class="material-symbols-outlined" style="font-size: 20px;">edit</span>';
        this.editTitleElement.title = "Edit Title";
        this.editTitleElement.className = "editTitleButton";
        this.element.appendChild(this.editTitleElement);

        this.titleText = document.createElement('div');
        this.titleText.innerHTML = "Title";
        this.titleText.className = "titleBarText";
        this.element.appendChild(this.titleText);

        this.deleteElement = document.createElement('div');
        this.deleteElement.innerHTML =
            '<span class="material-symbols-outlined" style="font-size: 20px;">close</span>';
        this.deleteElement.title = "Delete";
        this.deleteElement.className = "deleteButton";
        this.element.appendChild(this.deleteElement);

        this.deleteElement.addEventListener('mousedown', () => {
            this.parentCellObj.delete();
        });

        this.editTitleElement.addEventListener('mousedown', () => {
            this.changeTitle();
        });

        this.initMoving();
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'CellTitleBar';
    }

    changeTitle() {
        this.titleText.innerHTML = prompt("Insert a new title", "Title");
    }

    initMoving() {
        this.element.addEventListener('mousedown', (e) => {
            if (this.boardObj.global_status != enum_status.nothing) {
                return;
            }
            this.boardObj.setSelectionDistance(this);

            this.boardObj.setStatus(enum_status.movingCell);

            this.element.style.cursor = "grabbing";

            const rect = this.parentCell.getBoundingClientRect();

            e.preventDefault();

            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;

            this.moveHandlerBound = (e) => this.moveHandler(e, offsetX, offsetY);
            this.stopMoveHandlerBound = () => this.stopMoveHandler();

            document.addEventListener('mousemove', this.moveHandlerBound);
            document.addEventListener('mouseup', this.stopMoveHandlerBound);
        });
    }

    setSelectionDistance(disX, disY){
        this.disX = disX;
        this.disY = disY;
        console.log(this.disX + "::" + this.disY);
    }

    moveFromOutside(x, y){
        
        this.parentCellObj.setCoordinates(
            Math.floor(x + this.disX),
            Math.floor(y + this.disY)
        );

    }

    moveHandler = (e, offsetX, offsetY) => {
        this.parentCellObj.setCoordinates(
            Math.floor((e.clientX - this.parentCellObj.camX - offsetX) / gridCellW),
            Math.floor((e.clientY - this.parentCellObj.camY - offsetY) / gridCellH)
        );
        this.boardObj.moveSelection(this);
    };

    stopMoveHandler = () => {
        this.boardObj.setStatus(enum_status.nothing);
        document.removeEventListener('mousemove', this.moveHandlerBound);
        document.removeEventListener('mouseup', this.stopMoveHandlerBound);
        this.element.style.cursor = "grab";
    };
}

//==========================================================================
// Editable Inner HTML
//==========================================================================
class CellInnerDiv {
    constructor(parentCell, parentCellObj, boardObj) {
        this.cellInnerHTMLElement = document.createElement('div');
        this.cellInnerHTMLElement.className = "cellInnerHTML";

        this.parentCell = parentCell;
        this.parentCellObj = parentCellObj;
        this.boardObj = boardObj;

        parentCell.appendChild(this.cellInnerHTMLElement);

        this.cellInnerHTMLElement.addEventListener("input", () => this.onInput());
        this.cellInnerHTMLElement.addEventListener("paste", () => this.onPaste());
        this.cellInnerHTMLElement.addEventListener("focus", (e) => this.onFocus(e));
        this.cellInnerHTMLElement.addEventListener("focusout", (e) => this.onFocusout(e));

        // Constants
        this.TITLE_BAR_HEIGHT = 1;
    }

    lockEdit() {
        this.cellInnerHTMLElement.contentEditable = 'false';
    }

    unlockEdit() {
        this.cellInnerHTMLElement.contentEditable = 'true';
    }

    setSize(w, h) {
        if (w < this.parentCellObj.minWidth) {
            w = this.parentCellObj.minWidth;
        }

        if (h < this.parentCellObj.minHeight) {
            h = this.parentCellObj.minHeight;
        }

        this.cellInnerHTMLElement.style.height = `${h * gridCellH}px`;
        this.cellInnerHTMLElement.style.width = `${w * gridCellW}px`;
    }

    onFocus(e) {
        this.boardObj.setStatus(enum_status.editting);
        console.log(this.boardObj.global_status);
    }

    onFocusout(e) {
        this.boardObj.setStatus(enum_status.nothing);
    }

    onInput() {
        this.resizeToFitContent();
    }

    onPaste() {
        // Delay to allow size calculation after paste
        this.parentCell.scrollTop = 0;
        setTimeout(() => {
            this.resizeToFitContent();
        }, 10);
    }

    resizeToFitContent() {
        // Reset dimensions to auto
        this.cellInnerHTMLElement.style.height = 'auto';
        this.cellInnerHTMLElement.style.width = 'auto';

        this.parentCell.scrollTop = 0;

        // Calculate content size
        let contentHeight = this.cellInnerHTMLElement.scrollHeight + 32;
        //let contentWidth = this.cellInnerHTMLElement.scrollWidth + 32;

        // Adjust to grid size
        contentHeight = Math.ceil(contentHeight / gridCellH);
        //contentWidth = Math.ceil(contentWidth / gridCellW);

        /*if (contentWidth > this.parentCellObj.width) {
            this.setSize(contentWidth, this.parentCellObj.height);
            this.parentCellObj.setSize(contentWidth, this.parentCellObj.height);
        }*/

        if (this.parentCellObj.width > contentWidth) {
            this.setSize(this.parentCellObj.width + 1, this.parentCellObj.height);
        }

        if (contentHeight > this.parentCellObj.height) {
            this.setSize(this.parentCellObj.width, contentHeight);
            this.parentCellObj.setSize(
                this.parentCellObj.width,
                contentHeight + this.TITLE_BAR_HEIGHT
            );
        }

        if (this.parentCellObj.height > contentHeight) {
            this.setSize(this.parentCellObj.width, this.parentCellObj.height);
        }
    }
}

//==========================================================================
// Resize Corner
//==========================================================================
class resizeCorner {
    constructor(parentCell, parentCellObj, boardObj) {
        this.element = document.createElement('div');
        this.element.className = 'corner';
        this.parentCellObj = parentCellObj;
        this.parentCell = parentCell;

        this.boardObj = boardObj;

        parentCell.appendChild(this.element);
        this.initResize();
    }

    initResize() {
        this.element.addEventListener('mousedown', (e) => {
            this.boardObj.setStatus(enum_status.resizingCell);
            document.addEventListener('mousemove', this.resizeHandler);
            document.addEventListener('mouseup', this.stopResizeHandler);
        });
    }

    resizeHandler = (e) => {
        const newWidth = e.clientX - this.parentCell.getBoundingClientRect().left;
        const newHeight = e.clientY - this.parentCell.getBoundingClientRect().top;
        this.parentCellObj.setSize(
            Math.floor(newWidth / gridCellW),
            Math.floor(newHeight / gridCellH)
        );
    };

    stopResizeHandler = () => {
        this.boardObj.setStatus(enum_status.nothing);
        document.removeEventListener('mousemove', this.resizeHandler);
        document.removeEventListener('mouseup', this.stopResizeHandler);
    };
}

//==========================================================================
// Cell
//==========================================================================
class Cell {
    constructor(x, y, camX, camY, boardElemnt, boardClass) {
        this.x = x;
        this.y = y;
        this.camX = camX;
        this.camY = camY;
        this.width = 8;
        this.height = 2;
        this.minWidth = 8;
        this.minHeight = 2;

        this.boardElemnt = boardElemnt;
        this.boardClass = boardClass;

        this.deleted = false;

        this.selected = false;

        this.createCellElement();
        this.createTitleBar();
        this.createInnerDiv();
        this.createResizeCorner();
        this.updateCellPos();
        this.unlockEdit();
    }

    setSelected(state){
        this.selected = state;
        if(state){
            this.element.style.border = "2px solid #0033A0";
        }else{
            this.element.style.border = "";
        }
    }

    createTitleBar() {
        this.titleBar = new CellTitleBar("", this.element, this, this.boardClass);
    }

    createInnerDiv() {
        this.innerDiv = new CellInnerDiv(this.element, this, this.boardClass);
    }

    createResizeCorner() {
        this.resizeCorner = new resizeCorner(this.element, this, this.boardClass);
    }

    createCellElement() {
        this.element = document.createElement('div');
        this.element.className = 'cell';
        this.boardElemnt.appendChild(this.element);

        this.updateSize();
    }

    setSize(w, h) {
        if (w < this.minWidth) {
            w = this.minWidth;
        }

        if (h < this.minHeight) {
            h = this.minHeight;
        }

        this.width = w;
        this.height = h;

        this.updateSize();
    }

    updateSize() {
        this.element.style.width = this.width * gridCellW + "px";
        this.element.style.height = this.height * gridCellH + "px";
    }

    updateCellPos() {
        this.element.style.left = this.x * gridCellW + this.camX + "px";
        this.element.style.top = this.y * gridCellH + this.camY + "px";
    }

    getCoordinates() {
        return { x: this.x, y: this.y };
    }

    setCamCoordinates(x, y) {
        this.camX = x;
        this.camY = y;
        this.updateCellPos();
    }

    setCoordinates(x, y) {
        this.x = x;
        this.y = y;
        this.updateCellPos();
    }

    lockEdit() {
        this.innerDiv.lockEdit();
    }

    unlockEdit() {
        this.innerDiv.unlockEdit();
    }

    delete() {
        this.deleted = true;
        this.boardClass.setStatus(enum_status.nothing);
        this.element.remove();
    }

    // Serialize method
    serialize() {
        return {
            type: 'Cell',
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            innerHTML: this.innerDiv ? this.innerDiv.cellInnerHTMLElement.innerHTML : '',
            title: this.titleBar ? this.titleBar.titleText.innerHTML : ''
        };
    }
}

//==========================================================================
// Frame
//==========================================================================
class Frame extends Cell {
    constructor(x, y, camX, camY, boardElement, boardClass) {
        super(x, y, camX, camY, boardElement, boardClass);
    }

    setSelected(state){
        this.selected = state;
        if(state){
            this.element.style.border = "5px double #0033A0";
        }else{
            this.element.style.border = "";
        }
    }

    createTitleBar() {
        this.titleBar = new FrameTitleBar("", this.element, this, this.boardClass);
    }

    createInnerDiv() {
        // Frames do not have innerDiv
    }

    createResizeCorner() {
        this.resizeCorner = new resizeCorner(this.element, this, this.boardClass);
    }

    createCellElement() {
        this.element = document.createElement('div');
        this.element.className = 'frame';
        this.boardElemnt.appendChild(this.element);

        this.updateSize();
    }

    lockEdit() {
        // Frames do not have editable content
    }

    unlockEdit() {
        // Frames do not have editable content
    }

    delete() {
        super.delete();
    }

    // Serialize method
    serialize() {
        const data = super.serialize();
        data.type = 'Frame';
        return data;
    }
}

//==========================================================================
// Frame Title Bar
//==========================================================================
class FrameTitleBar extends CellTitleBar {
    constructor(label, parentCell, parentCellObj, boardObj) {
        super(label, parentCell, parentCellObj, boardObj);
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'frameTitleBar';
        this.element.innerHTML = this.label;
    }
}

//==========================================================================
// Main
//==========================================================================
const board = new Board('Board');
window.board = board;
window.createTextCellCenter = () => window.board.createTextCellCenter();
window.createFrameCellCenter = () => window.board.createFrameCellCenter();

// Function to save to file
function downloadBoardState() {
    const saveData = board.save();

    // Prompt the user for a file name
    let fileName = prompt('Enter a name for your plan:', 'Untitled Plan');
    if (fileName === null || fileName.trim() === '') {
        // User cancelled the prompt or entered an empty name
        alert('Save cancelled. No file name was provided.');
        return;
    }

    // Ensure the file name ends with '.fmp'
    if (!fileName.toLowerCase().endsWith('.fmp')) {
        fileName += '.fmp';
    }

    const blob = new Blob([saveData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Function to handle file selection and loading
function uploadBoardState(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Check if the file has a .fmp extension
    if (!file.name.endsWith('.fmp')) {
        alert('Please select a valid .fmp file.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const contents = e.target.result;
        board.load(contents);
    };
    reader.readAsText(file);
}
// Add event listener to the load button
document.getElementById('loadButton').addEventListener('click', () => {
    // Programmatically click the hidden file input
    document.getElementById('fileInput').click();
});

// Add event listener to the hidden file input
document.getElementById('fileInput').addEventListener('change', uploadBoardState);

// Functions to save and load to/from localStorage
function saveToLocalStorage() {
    const saveData = board.save();
    localStorage.setItem('boardState', saveData);
}

function loadFromLocalStorage() {
    const savedData = localStorage.getItem('boardState');
    if (savedData) {
        board.load(savedData);
    } else {
        alert('No saved board state found in local storage.');
    }
}

// Expose the functions to the global scope
window.downloadBoardState = downloadBoardState;
window.uploadBoardState = uploadBoardState;
window.saveToLocalStorage = saveToLocalStorage;
window.loadFromLocalStorage = loadFromLocalStorage;
window.clear = () => window.board.clear();

window.addEventListener('load', () => {
    loadFromLocalStorage();
});

setInterval(() => {
    saveToLocalStorage();
    console.log('Board state saved to localStorage.');
}, 5000); // 5000 milliseconds = 5 seconds