import * as Lancelot from "../lib/core.js";

class Game {
    constructor() {
        this._Init();
    }
    _Init() {

        this._sceneManager = new Lancelot.SceneManager();

        this._renderer = new Lancelot.Renderer({
            container: document.getElementById("game-container"),
            canvas: document.getElementById("canvas"),
            width: 720,
            height: 720,
            scenes: this._sceneManager
        });

        this._engine = new Lancelot.Engine({
            scenes: this._sceneManager,
            renderer: this._renderer,
            start: this._Preload.bind(this)
        });

        this._input = {
            left: false,
            right: false,
            jumping: false
        };

        Lancelot.id("button-left").addEventListener("touchstart", () => this._input.left = true);
        Lancelot.id("button-left").addEventListener("touchend", () => this._input.left = false);
        Lancelot.id("button-right").addEventListener("touchstart", () => this._input.right = true);
        Lancelot.id("button-right").addEventListener("touchend", () => this._input.right = false);
        Lancelot.id("button-jump").addEventListener("touchstart", () => this._input.jumping = true);
        Lancelot.id("button-jump").addEventListener("touchend", () => this._input.jumping = false);

        window.addEventListener("keydown", (e) => {
            switch(e.key) {
                case "w":
                    this._input.jumping = true;
                break;
                case "a":
                    this._input.left = true;
                break;
                case "d":
                    this._input.right = true;
                break;

            }
        });
        window.addEventListener("keyup", (e) => {
            switch(e.key) {
                case "w":
                    this._input.jumping = false;
                break;
                case "a":
                    this._input.left = false;
                break;
                case "d":
                    this._input.right = false;
                break;

            }
        });
        
    }
    _Preload() {

        const loader = new Lancelot.Loader();

        loader
        .OnProgress((val, obj) => console.log(`${obj.path} ... ${val * 100}%`))
            .SetPath("res")
            .AddImage("player", "assets/player.png")
            .AddAudio("main-theme", "audio/journey-awaits.mp3")
            .AddAudio("click-sound", "audio/mouse-click.mp3")
            .AddFont("main-font", "fonts/slkscre.ttf")
            .Load((resources) => {

            this._resources = resources;

            this._renderer._canvas.style.fontFamily = this._resources.get("main-font");
            Lancelot.id("end-section").style.fontFamily = this._resources.get("main-font");

            Lancelot.hide(Lancelot.id("intro-section"));
            Lancelot.show(Lancelot.id("play-section"));

            const music = this._resources.get("main-theme");
            music.loop = true;
            music.play();

            this._currentLevel = 0;
            this._PlayLevel(this._currentLevel);

        });
    }
    _PlayLevel(number) {
        if(number > 6) {
            Lancelot.show(Lancelot.id("end-section"));
            Lancelot.hide(Lancelot.id("play-section"));
            return;
        }
        this._CreateLevel(number);
        this._sceneManager.Play("Level" + number);
    }
    _CreateLevel(number) {

        

        const scene = new Lancelot.Scene({
            resources: this._resources,
            bounds: [[-1000, -1000], [2000, 500]],
            cellDimensions: [200, 200],
            input: this._input
        });

        this._sceneManager.Add(scene, "Level" + number);

        const CreatePlayer = (x, y) => {
            const player = new Lancelot.Entity();
            
            const sprite = new Lancelot.drawable.Sprite({
                width: 32,
                height: 32,
                zIndex: 20,
                image: this._resources.get("player"),
                frameWidth: 16,
                frameHeight: 16
            });
            sprite.AddAnim("idle", [
                { x: 1, y: 1 }
            ]);
            sprite.AddAnim("run", [
                { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 0 }
            ]);
            sprite.AddAnim("jump", [
                { x: 0, y: 1 }
            ]);
            sprite.AddAnim("ledder", [
                { x: 4, y: 0 }, { x: 4, y: 1 }
            ]);
            sprite.AddAnim("shoot", [
                { x: 3, y: 0 }
            ]);
            sprite.AddAnim("die", [
                { x: 3, y: 1 }
            ]);
            player.AddComponent(sprite);
            const body = new Lancelot.physics.Box({
                width: sprite._width * 0.74,
                height: sprite._height * 0.98,
                frictionX: 0.08,
                frictionY: 0.01,
                mass: 1,
                followBottomObject: true
            });
            player.AddComponent(body, "Body");
            const controller = new PlayerController({
                dieAction: () => {
                    this._PlayLevel(this._currentLevel);
                }
            });
            player.AddComponent(controller);
            player.AddComponent(new TrailEffect({
                zIndex: 19,
                count: 30,
                lineWidth: 7,
                rgb: [255, 255, 255]
            }));
            scene.AddEntity(player, "Player");

            player.SetPosition(new Lancelot.Vector(x, y));

            scene._camera.Follow(player);
            player.body.AddBehavior("resolveCollision", "p1");
            
            return player;
        }

        const CreateButton = (x, y, w, rotCount, groups, text = "") => {
            const button = new Lancelot.Entity();
            for(let g of groups.split(" ")) {
                button.groupList.add(g);
            }
            button.SetPosition(new Lancelot.Vector(x, y));
            const sprite = new ButtonSprite({
                width: w,
                zIndex: 10,
                text: text,
                rotationCount: rotCount,
                fontFamily: "main-font"
            });
            button.AddComponent(sprite);
            const body = new Lancelot.physics.Box({
                width: sprite.width,
                height: sprite.height
            });
            button.AddComponent(body, "Body");
            const buttonController = new ButtonController();
            button.AddComponent(buttonController);
            scene.AddEntity(button);
            scene.SetInteractive(button, { capture: false });
            button.interactive.AddEventHandler("mousedown", () => {
                if(Lancelot.physics.DetectCollision(button.body, scene.GetEntityByName("Pointer").body)) {
                    buttonController._pressedByMouse = true;
                }
            });
            button.interactive.AddEventHandler("mouseup", () => {
                buttonController._pressedByMouse = false;
            });
            return button;
        }

        const CreateStartButton = (x, y, rotCount, groups) => {
            const w = 140;
            const button = CreateButton(x, y, w, rotCount, groups, "START");
            button.groupList.add("s");

            button.GetComponent("ButtonController").action = () => {
                const glitcher = scene.GetEntityByName("Glitcher").GetComponent("Glitcher");
                glitcher._active = true;
                this._engine.Timeout(() => {
                    ++this._currentLevel;
                    this._PlayLevel(this._currentLevel);
                    glitcher._active = false;
                }, 2000);
                button.GetComponent("ButtonController").action = null;
            }

            return button;
        }

        const CreateQuitButton = (x, y, rotCount, groups, side = "right") => {
            const w = 140;
            const button = CreateButton(x, y, w, rotCount, groups, "QUIT");
            button.groupList.add("q");

            const buttonMenu = new Lancelot.Entity();
            
            for(let g of groups.split(" ")) {
                buttonMenu.groupList.add(g);
            }
            const sprite = new ButtonMenuSprite({
                zIndex: 5,
                rotationCount: rotCount
            });
            buttonMenu.AddComponent(sprite, "Sprite");
            const body = new Lancelot.physics.Box({
                width: sprite.width,
                height: sprite.height
            });
            buttonMenu.AddComponent(body, "Body");
            const angle = side == "right" ? Math.PI / 2 * rotCount : Math.PI / 2 * (rotCount + 2);
            buttonMenu.SetPosition(new Lancelot.Vector(x + Math.round(Math.cos(angle)) * (w - sprite._width) / 2, y + Math.round(Math.sin(angle)) * (w - sprite._width) / 2));
            scene.AddEntity(buttonMenu);

            const menuController = new ButtonMenuController({
                x: buttonMenu._pos.x,
                y: buttonMenu._pos.y,
                menu: buttonMenu,
                direction: (side == "right" ? rotCount : rotCount + 2) % 4 
            });
            button.AddComponent(menuController);

            button.GetComponent("ButtonController").action = (dur = 1000) => {
                const quitButtons = scene.GetEntitiesByGroup("q");
                for(let btn of quitButtons) {
                    btn.GetComponent("ButtonMenuController").Toggle(dur);
                }
            }

            return button;
        }

        const CreateOptButton = (x, y, rotCount, groups, side = "right") => {
            const w = 140;
            const button = CreateButton(x, y, w, rotCount, groups, "OPTIONS");
            button.groupList.add("o");

            const musicRange = new Lancelot.Entity();

            for(let g of groups.split(" ")) {
                musicRange.groupList.add(g);
            }
            musicRange.groupList.add("m");
            const sprite = new MusicRangeSprite({
                zIndex: -1,
                rotationCount: rotCount
            });
            musicRange.AddComponent(sprite, "Sprite");
            const angle = side == "right" ? Math.PI / 2 * rotCount : Math.PI / 2 * (rotCount + 2);
            
            const toggler = new Lancelot.drawable.Rect({
                fixed: false,
                width: 16,
                height: sprite._height,
                zIndex: 6,
                rotationCount: rotCount,
                background: "white"
            });
            musicRange.AddComponent(toggler, "Toggler");
            const body = new Lancelot.physics.Box({
                fixed: false,
                width: toggler.width,
                height: toggler.height
            });
            musicRange.AddComponent(body, "Body");

            toggler._pos = body._pos;
            
            musicRange.SetPosition(new Lancelot.Vector(x + Math.round(Math.cos(angle)) * (w - sprite._width) / 2, y + Math.round(Math.sin(angle)) * (w - sprite._width) / 2));
            body.SetPosition(new Lancelot.Vector(musicRange._pos.x, musicRange._pos.y));
            
            scene.AddEntity(musicRange);

            const controller = new MusicRangeController({
                direction: rotCount
            });
            musicRange.AddComponent(controller);

            scene.SetInteractive(musicRange, { capture: false });
            musicRange.interactive.AddEventHandler("mousedown", (e) => {
                if(Lancelot.physics.DetectCollision(musicRange.body, scene.GetEntityByName("Pointer").body)) {
                    controller._pressed = true;
                }
            });
            musicRange.interactive.AddEventHandler("mousemove", (e) => {
                if(controller._pressed) {
                    controller.OnInput(e.x, e.y);
                    const musicBars = scene.GetEntitiesByGroup("m");
                    for(let bar of musicBars) {
                        const anotherCOntroller = bar.GetComponent("MusicRangeController");
                        anotherCOntroller._moving = controller._moving;
                    }
                }
            });
            musicRange.interactive.AddEventHandler("mouseup", (e) => {
                controller._pressed = false;
                controller._moving = false;
                const musicBars = scene.GetEntitiesByGroup("m");
                for(let bar of musicBars) {
                    bar.GetComponent("MusicRangeController")._moving = controller._moving;
                }
            });

            const menuController = new ButtonMenuController({
                x: musicRange._pos.x,
                y: musicRange._pos.y,
                menu: musicRange,
                direction: (side == "right" ? rotCount : rotCount + 2) % 4 
            });
            button.AddComponent(menuController);

            button.GetComponent("ButtonController").action = (dur = 1000) => {
                const optButtons = scene.GetEntitiesByGroup("o");
                for(let btn of optButtons) {
                    btn.GetComponent("ButtonMenuController").Toggle(dur);
                }
            }

            return button;
        }

        const CreatePointer = (x, y) => {

            const UpdatePointer = (e) => {
                if(e.id != 0) { return; }
                pointer.GetComponent("PointerController")._mousePosition = new Lancelot.Vector(e.x + pointer.body.width / 2, e.y + pointer.body.height / 2);
            }

            const pointer = new Lancelot.Entity();

            const sprite = new PointerSprite({
                zIndex: 99
            });
            pointer.AddComponent(sprite);
            const body = new Lancelot.physics.Box({
                width: sprite.width,
                height: sprite.height,
                mass: 1
            });
            pointer.AddComponent(body, "Body");
            pointer.AddComponent(new PointerController());

            pointer.SetPosition(new Lancelot.Vector(x, y));
            scene.AddEntity(pointer, "Pointer");

            pointer.body.AddBehavior("resolveCollision", "p2");

            scene.AddEventHandler("mousedown", (e) => UpdatePointer(e));
            scene.AddEventHandler("mousemove", (e) => UpdatePointer(e));

            return pointer;
        }

        const CreateTitle = (x, y, text = "MEMORY\nLEAK") => {
            const title = new Lancelot.Entity();

            title.AddComponent(new Lancelot.drawable.Text({
                zIndex: -99,
                text: text,
                fontFamily: "main-font",
                fontSize: 64,
                color: "white"
            }));


            title.SetPosition(new Lancelot.Vector(x, y));
            scene.AddEntity(title);
            return title;
        }

        const glitcherEntity = new Lancelot.Entity();
        const glitcher = new Glitcher({
            zIndex: 999
        });
        glitcherEntity.AddComponent(glitcher);

        scene.AddEntity(glitcherEntity, "Glitcher");
        glitcher._pos = glitcher.scene._camera._pos;


        switch(number) {

            case 0:

                CreateTitle(0, -200);
                CreatePointer(0, 0);
                CreateStartButton(0, 0, 0, "p1");
                CreateOptButton(0, 80, 0, "p1");
                CreateQuitButton(0, 160, 0, "p1", "left");

            break;

            case 1:

                CreateTitle(0, -200);
                CreatePlayer(0, -200);
                CreatePointer(0, 0);
                CreateButton(0, 0, 140, 0, "p1");
                CreateOptButton(0, 80, 0, "p1");
                CreateQuitButton(0, 160, 0, "p1", "left");
                CreateButton(280, 0, 140, 0, "p1");
                CreateButton(560, 0, 140, 0, "p1");
                CreateButton(700, -20, 140, 0, "p1");
                CreateButton(910, -40, 280, 0, "p1");
                CreateStartButton(910, -250, 0, "p1");

            break;

            case 2:

                CreatePlayer(-500, -200);
                CreatePointer(-400, 0);
                CreateButton(-500, 0, 140, 0, "p1");
                CreateQuitButton(-130, 0, 0, "p1", "left");
                CreateButton(150, 0, 140, 0, "p1");
                CreateQuitButton(430, 0, 0, "p1", "right");
                CreateQuitButton(610, -220, 1, "p1", "right");
                CreateButton(800, 0, 140, 0, "p1");
                CreateStartButton(1060, 0, 0, "p1");

            break;

            case 3:

                CreatePlayer(-100, -200);
                CreatePointer(0, 0);
                CreateButton(0, 0, 280, 0, "p1");
                CreateButton(-165, -50, 140, 1, "p1");
                CreateOptButton(170, 50, 3, "p1", "right");
                CreateButton(215, -90, 140, 3, "p1");
                CreateQuitButton(265, -180, 0, "p1", "left");
                CreateButton(215, -240, 70, 3, "p1");
                CreateButton(50, -210, 70, 0, "p1");
                CreateButton(305, -255, 140, 0, "p1");
                CreateButton(500, -90, 140, 0, "p1");
                CreateStartButton(800, -255, 0, "p1");

            break;

            case 4:

                CreatePlayer(0, -200);
                CreatePointer(300, -200);
                CreateButton(0, 0, 140, 0, "p1");
                CreateButton(260, 0, 140, 0, "p1");
                CreateStartButton(520, 0, 0, "p1");
                CreateButton(260, -90, 140, 0, "p2");
                CreateButton(260, -330, 140, 2, "p2");
                CreateButton(160, -210, 280, 1, "p2");
                CreateButton(360, -210, 280, 3, "p2");

            break;

            case 5:

                CreatePlayer(-400, -200);
                CreatePointer(-300, -350);
                CreateButton(-400, 0, 70, 0, "p1");
                CreateButton(-240, -40, 70, 0, "p1");
                CreateButton(-40, -80, 140, 0, "p1");
                let button = CreateQuitButton(-40, -235, 3, "p1 p2", "right");
                button.GetComponent("ButtonController").action(100);
                CreateOptButton(140, -40, 3, "p1", "right");
                CreateButton(185, -110, 280, 3, "p1");
                CreateStartButton(260, 100, 0, "p1");

                CreateButton(-140, -285, 140, 0, "p2");
                CreateButton(50, -285, 140, 0, "p2");
                CreateButton(-355, -285, 280, 0, "p2");
                CreateButton(265, -285, 280, 0, "p2");
                CreateButton(-475, -370, 140, 1, "p2");
                CreateButton(385, -370, 140, 3, "p2");
                CreateButton(-325, -420, 280, 2, "p2");
                CreateButton(-40, -420, 280, 2, "p2");
                CreateButton(245, -420, 280, 2, "p2");

                CreateOptButton(100, -350, 0, "", "right");

            break;

            case 6:

                CreatePlayer(-400, -200);
                CreatePointer(-300, -350);
                CreateButton(-400, 0, 70, 0, "p1");
                CreateQuitButton(-50, 0, 0, "p1", "left");
                CreateButton(200, 0, 70, 0, "p1");
                CreateButton(440, 0, 140, 0, "p1");
                CreateButton(800, 0, 280, 0, "p1");
                CreateOptButton(1040, -250, 1, "p1", "right");
                CreateButton(1180, -60, 70, 0, "p1");
                CreateButton(1340, -80, 70, 0, "p1");
                CreateButton(1500, -120, 70, 0, "p1");
                CreateStartButton(1700, -120, 0, "p1");

                CreateButton(-325, -285, 280, 0, "p2");
                CreateButton(-40, -285, 280, 0, "p2");
                CreateButton(245, -285, 280, 0, "p2");
                CreateButton(-475, -370, 140, 1, "p2");
                CreateButton(385, -370, 140, 3, "p2");
                CreateButton(-325, -420, 280, 2, "p2");
                CreateButton(-40, -420, 280, 2, "p2");
                CreateButton(245, -420, 280, 2, "p2");

                CreateQuitButton(-350, -350, 0, "", "right");
                CreateOptButton(280, -350, 0, "", "left");

            break;

        }
        
    }
}

class PlayerController extends Lancelot.Component {
    constructor(params) {
        super();
        this._dieAction = params.dieAction;
    }
    Update(elapsedTimeS) {
        
        const sprite = this.GetComponent("Sprite");
        const body = this._parent.body;

        const input = this.scene._input;
        
        body._vel.y += 750 * elapsedTimeS;

        if (input.right) {
            body._vel.x += 1850 * elapsedTimeS;
            sprite._flip.x = false;
        }
        if (input.left) {
            body._vel.x -= 1850 * elapsedTimeS;
            sprite._flip.x = true;
        }

        if (body._collisions.bottom.size && input.jumping) {
            body._vel.y = -350;
        }

        if(!body._collisions.bottom.size) {
            sprite.PlayAnim("jump", 100, false);
        } else {
            if(Math.abs(body._vel.x) > 50) {
                sprite.PlayAnim("run", 120, true);
            } else {
                sprite.PlayAnim("idle", 100, false);
            }
        }

        if(body._pos.y > 500) {
            this._dieAction();
        }
    
    }
        
}

class ButtonSprite extends Lancelot.drawable.Drawable {
    constructor(params) {
        super(params);
        this._width = this._params.width;
        this._height = 40;
        this._text = this._params.text;
        this._fontFamily = this._params.fontFamily;
        this._pressed = false;
    }
    get width() {
        return this._rotationCount % 2 == 0 ? this._width : this._height;
    }
    get height() {
        return this._rotationCount % 2 == 1 ? this._width : this._height;
    }
    Draw(ctx) {
        ctx.save();
        ctx.translate(this._pos.x, this._pos.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = "black";
        ctx.strokeStyle = "white";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.rect(-this._width / 2, -this._height / 2, this._width, this._height);
        ctx.fill();
        ctx.stroke();
        ctx.save();
        if(!this._pressed) {
            ctx.translate(0, -6);
        }
        ctx.fillStyle = "black";
        ctx.strokeStyle = "white";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.rect(-this._width / 2, -this._height / 2, this._width, this._height);
        ctx.fill();
        ctx.stroke();
        if(this._text.length) {
            ctx.fillStyle = "white";
            ctx.font = `${24}px '${this._fontFamily}'`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(this._text, 0, 0);
        }
        ctx.restore();
        ctx.restore();
    }
}

class ButtonController extends Lancelot.Component {
    constructor() {
        super();
        this._pressedByMouse = false;
        this._pressedByPlayer = false;
        this.action = null;
    }
    Update(_) {
        const body = this._parent.body;
        const sprite = this.GetComponent("ButtonSprite");
        this._pressedByPlayer = Object.values(body._collisions).some(_ => _.size);
        const pressed = (this._pressedByMouse || this._pressedByPlayer);
        if(!sprite._pressed && pressed) {
            try {
                this.scene._resources.get("click-sound").cloneNode(true).play();
            } catch(err) {
                
            }
            
            if(this.action) this.action();
        }
        sprite._pressed = pressed;
    }
}

class ButtonMenuSprite extends Lancelot.drawable.Drawable {
    constructor(params) {
        super(params);
        this._width = 80;
        this._height = 40;
    }
    get width() {
        return this._rotationCount % 2 == 0 ? this._width : this._height;
    }
    get height() {
        return this._rotationCount % 2 == 1 ? this._width : this._height;
    }
    Draw(ctx) {
        const DrawCross = (x, y, r) => {
            ctx.beginPath();
            ctx.strokeStyle = "white";
            ctx.lineWidth = 3;
            ctx.moveTo(x - r, y - r);
            ctx.lineTo(x + r, y + r);
            ctx.stroke();
            ctx.moveTo(x + r, y - r);
            ctx.lineTo(x - r, y + r);
            ctx.stroke();
        }
        const DrawPipe = (x, y, r) => {
            ctx.beginPath();
            ctx.strokeStyle = "white";
            ctx.lineWidth = 3;
            ctx.moveTo(x - r, y);
            ctx.lineTo(x - r * 0.3, y + r * 0.8);
            ctx.lineTo(x + r, y - r * 0.8);
            ctx.stroke();
        }
        const DrawSquare = (x, y, r) => {
            ctx.beginPath();
            ctx.strokeStyle = "white";
            ctx.lineWidth = 3;
            ctx.strokeRect(x - r, y - r, r * 2, r * 2);
        }
        ctx.save();
        ctx.translate(this._pos.x, this._pos.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = "black";
        ctx.strokeStyle = "white";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.rect(-this._width / 2, -this._height / 2, this._width, this._height);
        ctx.fill();
        ctx.stroke();
        DrawSquare(-this._height * 0.45, 0, this._height * 0.35);
        DrawPipe(-this._height * 0.45, 0, this._height * 0.25);
        DrawSquare(this._height * 0.45, 0, this._height * 0.35);
        DrawCross(this._height * 0.45, 0, this._height * 0.25);
        ctx.restore();
    }
}

class ButtonMenuController extends Lancelot.Component {
    constructor(params) {
        super();
        this._menuPosition = new Lancelot.Vector(params.x, params.y);
        this._menu = params.menu;
        this._direction = params.direction;
        this._opened = false;
        this._Init();
    }
    _Init() {
        let vec;
        const sprite = this._menu.GetComponent("Sprite");
        switch(this._direction) {
            case 0:
                vec = new Lancelot.Vector(sprite._width, 0);
                break;
            case 1:
                vec = new Lancelot.Vector(0, sprite._width);
                break;
            case 2:
                vec = new Lancelot.Vector(-sprite._width, 0);
                break;
            case 3:
                vec = new Lancelot.Vector(0, -sprite._width);
                break;
        }
        this._vec = vec;
    }
    Toggle(dur) {
        
        if(this._menu.animator._moving) { return; }

        if(!this._opened) {
            this._menu.animator.MoveTo(this._menuPosition.Clone().Add(this._vec), dur, "ease-in");
        } else {
            this._menu.animator.MoveTo(this._menuPosition.Clone(), dur, "ease-in");
        }

        this._opened = !this._opened;
    }
}

class MusicRangeSprite extends Lancelot.drawable.Drawable {
    constructor(params) {
        super(params);
        this._width = 140;
        this._height = 36;
    }
    get width() {
        return this._rotationCount % 2 == 0 ? this._width : this._height;
    }
    get height() {
        return this._rotationCount % 2 == 1 ? this._width : this._height;
    }
    Draw(ctx) {
        const DrawNote = (x, y, r) => {
            ctx.beginPath();
            ctx.fillStyle = "white";
            ctx.arc(x - r * 0.45, y + r, r * 0.5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.strokeStyle = "white";
            ctx.lineWidth = 3;
            ctx.moveTo(x, y + r);
            ctx.lineTo(x, y - r);
            ctx.lineTo(x + r * 0.5, y - r * 0.5);
            ctx.stroke();
        }
        ctx.save();
        ctx.translate(this._pos.x, this._pos.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = "white";
        ctx.strokeStyle = "white";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-this._width * 0.25, 0);
        ctx.lineTo(this._width * 0.4, 0);
        ctx.stroke();
        ctx.moveTo(-this._width * 0.25, -this._height * 0.1);
        ctx.lineTo(-this._width * 0.25, this._height * 0.1);
        ctx.stroke();
        ctx.moveTo(this._width * 0.4, -this._height * 0.1);
        ctx.lineTo(this._width * 0.4, this._height * 0.1);
        ctx.stroke();
        DrawNote(-this._width * 0.35, 0, this._height * 0.3);
        ctx.restore();
    }
}

class MusicRangeController extends Lancelot.Component {
    constructor(params) {
        super();
        this._pressed = false;
        this._mousePosition = new Lancelot.Vector();
        this._direction = params.direction;
        this._moving = 0;
    }
    OnInput(x, y) {

        const sprite = this.GetComponent("Sprite");
        if(this._direction % 2 == 0) {
            if(x > this._parent._pos.x + sprite._width / 2) this._moving = 1;
            else if(x < this._parent._pos.x - sprite._width / 2) this._moving = -1;
            else this._moving = 0;
        } else {
            if(y > this._parent._pos.y + sprite._width / 2) this._moving = 1;
            else if(y < this._parent._pos.y - sprite._width / 2) this._moving = -1;
            else this._moving = 0;
        }
        if(this._direction > 1) this._moving *= -1;
    }
    Update(elapsedTimeS) {
        
        const speed = 50;
        const body = this._parent.body;
        const sprite = this.GetComponent("Sprite");

        if(this._moving == 0) {
            body._vel.x = body._vel.y = 0;
        } else {

            let v = this._moving == 1 ? speed : -speed;
            if(this._direction == 2 || this._direction == 3) v *= -1;
            let a = sprite._width * 0.20;
            let b = sprite._width * 0.34;
            if(this._direction == 2 || this._direction == 3) {
                [a, b] = [b, a];
            }

            if(this._direction % 2 == 0) {
                if(!((body._pos.x < this._parent._pos.x - a && v < 0) || (body._pos.x > this._parent._pos.x + b && v > 0))) body._vel.x = v;
                else body._vel.x = 0; 
            } else {
                if(!((body._pos.y < this._parent._pos.y - a && v < 0) || (body._pos.y > this._parent._pos.y + b && v > 0))) body._vel.y = v;
                else body._vel.y = 0;
            }

        }

    }
}

class PointerController extends Lancelot.Component {
    constructor() {
        super();
        this._mousePosition = new Lancelot.Vector();
    }
    Update(elapsedTimeS) {
        const body = this._parent.body;
        const vec = this._mousePosition.Clone().Sub(body._pos);
        
        if(vec.Mag() < 1) {
            vec.Mult(0);
        } else if(vec.Mag() < 5) {
            vec.Mult(100);
        } else if(vec.Mag() < 50) {
            vec.Unit().Mult((vec.Mag() * 20) ** 2);
        } else {
            vec.Unit().Mult((vec.Mag() * 10) ** 3);
        }
        body._vel.Copy(vec);
    }
}

class PointerSprite extends Lancelot.drawable.Drawable {
    constructor(params) {
        super(params);
        this._width = 24;
        this._height = 32;
    }
    get width() {
        return this._width;
    }
    get height() {
        return this._height;
    }
    Draw(ctx) {
        ctx.save();
        ctx.translate(this._pos.x, this._pos.y);
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = "black";
        ctx.strokeStyle = "white";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -this._height * 0.5);
        ctx.lineTo(-this._width * 0.5, 0);
        ctx.lineTo(-this._width * 0.1, 0);
        ctx.lineTo(-this._width * 0.1, this._height * 0.5);
        ctx.lineTo(this._width * 0.1, this._height * 0.5);
        ctx.lineTo(this._width * 0.1, 0);
        ctx.lineTo(this._width * 0.5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

class TrailEffect extends Lancelot.drawable.Drawable {
    constructor(params) {
        super(params);
        this._count = (this._params.count || 45);
        this._lineWidth = (this._params.lineWidth || 5);
        this._rgb = (this._params.rgb || [255, 255, 255]);
        this._previousPositions = [];
        this._width = (this._params.width || 100);
        this._height = (this._params.height || 100);
    }
    get width() {
        return this._width;
    }
    get height() {
        return this._height;
    }
    Draw(ctx) {
        this._previousPositions.unshift(this._pos.Clone());
        if(this._previousPositions.length > this._count) {
            this._previousPositions.length = this._count;
        }
        ctx.save();
        for(let i = 0; i < this._previousPositions.length - 1; ++i) {
            const pos1 = this._previousPositions[i];
            const pos2 = this._previousPositions[i + 1];
            
            const grd = ctx.createLinearGradient(pos1.x, pos1.y, pos2.x, pos2.y);
            grd.addColorStop(0, `rgba(${this._rgb.join(",")},${(this._count - i) / this._count})`);
            grd.addColorStop(1, `rgba(${this._rgb.join(",")},${(this._count - i - 1) / this._count})`);
            
            ctx.beginPath();
            ctx.strokeStyle = grd;
            ctx.lineWidth = (this._count - i) / this._count * this._lineWidth + 1;
            ctx.lineCap = "round";
            ctx.moveTo(pos1.x, pos1.y);
            ctx.lineTo(pos2.x, pos2.y);
            ctx.stroke();
        }
        ctx.restore();
    }
}

class Glitcher extends Lancelot.drawable.Drawable {
    constructor(params) {
        super(params);
        this._active = false;
        this._counter = 0;
        this._imgData = [];
        this._dur = 2;
    }
    Draw(ctx) {
        const maxSize = 200;
        if(!this._active) { return; }
        ++this._counter;
        if(this._counter == this._dur) {
            this._dur = Lancelot.math.randint(2, 20);
            this._counter = 0;
            for(let i = 0; i < 20; ++i) {
                const imgData = ctx.getImageData(Lancelot.math.rand(0, ctx.canvas.width - maxSize), Lancelot.math.rand(0, ctx.canvas.height - maxSize), Lancelot.math.rand(1, maxSize), Lancelot.math.rand(1, maxSize));
                this._imgData[i] = [imgData, Lancelot.math.rand(0, ctx.canvas.width - maxSize), Lancelot.math.rand(0, ctx.canvas.height - maxSize)];
            }
        }
        for(let e of this._imgData) {
            ctx.putImageData(e[0], e[1], e[2]);
        }
    }
}

window.addEventListener("DOMContentLoaded", () => new Game());