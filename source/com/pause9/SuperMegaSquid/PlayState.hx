package com.pause9.supermegasquid;

import nme.geom.Point;
import org.flixel.nape.FlxPhysSprite;
import org.flixel.nape.FlxPhysState;
import nme.display.BitmapData;
import nape.phys.Body;
import nme.geom.Matrix;
import nme.geom.Rectangle;
import org.flixel.FlxG;
import nape.geom.Vec2;
import nape.phys.BodyType;
import nape.shape.Polygon;
import nape.shape.Circle;
import org.flixel.FlxCamera;
import org.flixel.FlxGroup;
import org.flixel.FlxPoint;
import org.flixel.FlxSprite;
import nape.phys.MassMode;
import nme.Assets;
import org.flixel.FlxText;
import org.flixel.FlxObject;
import org.flixel.plugin.pxText.FlxBitmapTextField;
import org.flixel.plugin.pxText.PxBitmapFont;
import org.flixel.plugin.pxText.PxButton;
import org.flixel.plugin.pxText.PxTextAlign;
import flash.ui.Mouse;
import nme.Lib;
import nape.space.Broadphase;
#if !mobile
import pgr.gconsole.GameConsole;
#end


class PlayState extends FlxPhysState
{
	//private var waveMachine:WaveMachine;
	//private var waveMachine:WaveMachine;
	private var testSwan:FlxSprite;
	//private var analog:SquidAnalog;
	//private var enemyAtlas:Atlas;
	#if flash
	private var fpsCounter:FlxText;
	#else
	private var fpsCounter:FlxBitmapTextField;
	#end
	private var times:Array<Float>;
	private var clouds:FlxGroup;
	private var bigClouds:FlxGroup;
	private var testBoat:FlxSprite;
	private var gameLoaded:Bool;
	private var gameLoader:GameLoader;
	
	public function new():Void
	{
		super();
		#if !neko
		FlxG.bgColor = 0xFFFFFFFF;
		#else
		FlxG.camera.bgColor = {rgb: 0xFFFFFF, a: 0xFF};
		#end
		
		#if mobile
		FlxG.mobile = true;
		#end
		
		#if flash
		FlxG.framerate = 60;
		FlxG.flashFramerate = 60;
		#else
		FlxG.framerate = 60;
		FlxG.flashFramerate = 60;
		#end
		gameLoader = new GameLoader();
		gameLoaded = false;
	}
	override public function create():Void
	{
		super.create();
		Registry.init();
		#if !FLX_NO_DEBUG
			#if desktop 
			//cpp.vm.Profiler.start("log.txt");
			#end
			#if mobile 
			//cpp.vm.Profiler.start("");
			#end
			#if (flash || desktop)
			GameConsole.init();
			GameConsole.registerVariable(Player, "power", "power", true);
			GameConsole.registerFunction(this, "enablePhysDebug", "enabledebug");
			GameConsole.registerFunction(this, "disablePhysDebug", "disabledebug");
			#end
		
			//FPS STUFF
			#if flash
			fpsCounter = new FlxText(700, 900, 300, "FPS: " + 60);
			fpsCounter.setFormat(null, 22, 0x000000, "center");
			#else
			var font:PxBitmapFont = new PxBitmapFont();
			font.loadPixelizer(Assets.getBitmapData("assets/data/fontData11pt.png"), " !\"#$%&'()*+,-./" + "0123456789:;<=>?" + "@ABCDEFGHIJKLMNO" + "PQRSTUVWXYZ[]^_" + "abcdefghijklmno" + "pqrstuvwxyz{|}~\\`");
			fpsCounter = new FlxBitmapTextField(font);
			fpsCounter.setWidth(300);
			fpsCounter.x = 800;
			fpsCounter.y = 850;
			fpsCounter.alignment = PxTextAlign.CENTER;
			fpsCounter.fontScale = 2;
			fpsCounter.text = "FPS: " + 60;
			fpsCounter.multiLine = true;
			//fpsCounter.atlas = Registry.myAtlas;
			#end
		#end
		
		times = [];
		FlxG.mouse.hide();
		#if !mobile
		Mouse.hide();
		FlxG.mouse.show();
		//FlxG.mouse.hide();
		#end
	}
	override public function update():Void
	{
		if (gameLoader != null)
		{
			if (!gameLoader.loaded)
			{
				gameLoader.update();
			}
			else
			{
				//FlxG.log("loadGame");
				loadGame();
			}
		}
		else
		{
			//Registry.water.y = -FlxG.height;
			//Registry.water.x = -FlxG.width;
			super.update();
			Registry.water.update();
			keyControl();
			manageClouds();
			#if !FLX_NO_DEBUG
			fpsCounter.x = Registry.player.x - 150;
			fpsCounter.y = Registry.player.y - 100;
			var t:Int = Lib.getTimer();
			var now:Float = t / 1000;
			times.push(now);
			while(times[0] < now - 1)
			{
				times.shift();
			}
			fpsCounter.text = FlxG.width + "x" + FlxG.height + "\nFPS: " + times.length + "/" + Lib.current.stage.frameRate;
			#end
		}
	}
	private function manageClouds():Void
	{
		var cloud:FlxSprite;
		var bigCloud:FlxSprite;
		var side:Float = Math.random() * 2 - 1;
		if (side < 0)
		{
			side = -1;
		}
		else
		{
			side = 1;
		}
		var rand:Float = Math.random() * 10;
		if (clouds.countLiving() < clouds.length && rand < 2)
		{
			cloud = cast(clouds.getFirstAvailable(), FlxSprite);
			//cloud = cast(cloud, FlxSprite);
			cloud.revive();
			cloud.y = Math.random() * 850 + 400;
			cloud.x = Registry.player.x + (Math.random() * 300 + 600) * side;
			cloud.velocity.x = -110;
		}
		for (cld in clouds.members)
		{
			cloud = cast(cld, FlxSprite);
			if (cloud.x < -200 || Math.abs(cloud.x - Registry.player.x) > 2000)
			{
				cloud.kill();
			}
		}
		var rand:Float = Math.random() * 20;
		if (bigClouds.countLiving() < bigClouds.length && rand < 2)
		{
			bigCloud = cast(bigClouds.getFirstAvailable(), FlxSprite);
			//cloud = cast(cloud, FlxSprite);
			bigCloud.revive();
			bigCloud.y = Math.random() * 400;
			bigCloud.x = Registry.player.x + (Math.random() * 300 + 700) * side;
			bigCloud.velocity.x = -80;
		}
		for (cld in bigClouds.members)
		{
			bigCloud = cast(cld, FlxSprite);
			if (bigCloud.x < -370 || Math.abs(bigCloud.x - Registry.player.x) > 2000)
			{
				bigCloud.kill();
			}
		}
	}
	private function keyControl():Void
	{
		if (Registry.player.spinTimer <= 0)
		{
			if (Registry.player.canMove)
			{
				#if mobile
				//**TOUCH CONTROLS
				if (Registry.player.body.velocity.length < 700)
				{
					Registry.player.body.velocity.x += Registry.analog.acceleration.x * Player.power;
					Registry.player.body.velocity.y += Registry.analog.acceleration.y * Player.power;
				}
				#else
				//**KEYBOARD CONTROLS
				if (FlxG.keys.pressed("W") && Registry.player.body.velocity.y > -500)
				{
					//Registry.player.body.velocity.y -= 2000;
					Registry.player.body.velocity.y -= 49 * Player.power;
					Registry.player.body.rotation = 4.71;
				}
				if (FlxG.keys.pressed("S") && Registry.player.body.velocity.y < 500)
				{
					Registry.player.body.velocity.y += 49 * Player.power;
					Registry.player.body.rotation = 1.57;
					//Registry.player.body.applyImpulse(Vec2.get(0, 290, true),null,false);
				}
				if (FlxG.keys.pressed("A") && Registry.player.body.velocity.x > -500)
				{
					Registry.player.body.velocity.x -= 49 * Player.power;
					Registry.player.body.rotation = 3.14;
					//Registry.player.body.applyImpulse(Vec2.get( -290, 0, true),null,false);
				}
				if (FlxG.keys.pressed("D") && Registry.player.body.velocity.x < 500)
				{
					Registry.player.body.velocity.x += 49 * Player.power;
					Registry.player.body.rotation = 0;
					//Registry.player.body.applyImpulse(Vec2.get(290, 0, true),null,false);
				}
				if (FlxG.keys.pressed("W") && FlxG.keys.pressed("D"))
				{
					Registry.player.body.rotation = 5.5;
				}
				else if (FlxG.keys.pressed("W") && FlxG.keys.pressed("A"))
				{
					Registry.player.body.rotation = 3.92;
				}
				else if (FlxG.keys.pressed("S") && FlxG.keys.pressed("A"))
				{
					Registry.player.body.rotation = 2.35;
				}
				else if (FlxG.keys.pressed("S") && FlxG.keys.pressed("D"))
				{
					Registry.player.body.rotation = .785;
				}
				if (Registry.player.body.velocity.length > 700)
				{
					//Registry.player.body.velocity.length = 700;
				}
				if (FlxG.keys.justPressed("SPACE"))
				{
					Registry.player.lunge(Registry.player.body.rotation);
				}
				#end
			}
			else
			{
				#if mobile
				if (Registry.player.body.velocity.length < 250)
				{
					Registry.player.body.velocity.x += Registry.analog.acceleration.x * Player.power * .1;
					if (Registry.analog.acceleration.y > 0)
					{
						Registry.player.body.velocity.y += Registry.analog.acceleration.y * Player.power * .1;
					}
				}
				#else
				if (FlxG.keys.pressed("W") && Registry.player.body.velocity.y > -500)
				{
					//Registry.player.body.velocity.y -= 2000;
					Registry.player.body.rotation = 4.71;
				}
				if (FlxG.keys.pressed("A") && Registry.player.body.velocity.x > -350)
				{
					Registry.player.body.velocity.x -= 49 * Player.power * .3;
					Registry.player.body.rotation = 3.14;
					//Registry.player.body.applyImpulse(Vec2.get(-72, 0, true),null,true);
				}
				if (FlxG.keys.pressed("S") && Registry.player.body.velocity.y < 350)
				{
					Registry.player.body.velocity.y += 49 * Player.power * .3;
					Registry.player.body.rotation = 1.57;
					//Registry.player.body.applyImpulse(Vec2.get(0, 20, true),null,false);
				}
				if (FlxG.keys.pressed("D") && Registry.player.body.velocity.x < 350)
				{
					Registry.player.body.velocity.x += 49 * Player.power * .3;
					//Registry.player.body.applyImpulse(Vec2.get(72, 0, true), null, true);
					Registry.player.body.rotation = 0;
				}
				if (FlxG.keys.pressed("W") && FlxG.keys.pressed("D"))
				{
					Registry.player.body.rotation = 5.5;
				}
				else if (FlxG.keys.pressed("W") && FlxG.keys.pressed("A"))
				{
					Registry.player.body.rotation = 3.92;
				}
				else if (FlxG.keys.pressed("S") && FlxG.keys.pressed("A"))
				{
					Registry.player.body.rotation = 2.35;
				}
				else if (FlxG.keys.pressed("S") && FlxG.keys.pressed("D"))
				{
					Registry.player.body.rotation = .785;
				}
				if (Registry.player.body.velocity.length > 700)
				{
					//Registry.player.body.velocity.length = 700;
				}
				if (FlxG.keys.justPressed("SPACE"))
				{
					Registry.player.lunge(Registry.player.body.rotation);
				}
				#end
			}
			#if !mobile
			if (FlxG.keys.justPressed("Q"))
			{
				Registry.player.activateSpin();
			}
			if (FlxG.keys.justPressed("E"))
			{
				Registry.player.activateEggBombs();
			}
			#end
		}
	}
	private function loadGame():Void
	{
		//waveMachine = new WaveMachine();
		FlxG._game.addChildAt(Registry.water, 1);
		FlxG._game.addChildAt(Registry.uiLayer, 2);
		//var display:Dynamic = FlxG._game.getChildAt(0);
		
		Registry.waveSprite.cbTypes.add(Registry.WATER);
		//Registry.waveSprite.body.shapes.clear();
		FlxG.camera.follow(Registry.player);
		//FlxG.camera.followAdjust( -15, -15);
		FlxG.camera.followLerp = 4.5;
		FlxPhysState.space.gravity = new Vec2(0, 1200);
		velocityIterations = 6;
		positionIterations = 5;
		#if !FLX_NO_DEBUG
		disablePhysDebug();
		#end
		//FlxG.camera.width = FlxG.stage.stageWidth;
		//FlxG.camera.height = FlxG.stage.stageHeight;
		FlxG.camera.setBounds(0, 0, 8697, 3000);
		FlxPhysState.space.worldLinearDrag = .03;
		FlxPhysState.space.worldAngularDrag = .03;
		
		//Clouds
		clouds = new FlxGroup(15);
		for (i in 0...15)
		{
			var cloud:FlxSprite = new FlxSprite(Math.random() * (Registry.player.x + 600), Math.random() * 800 + 400, "assets/cloud" + Std.string(Math.ceil(Math.random() * 4)) + ".png");
			#if (cpp || neko)
				cloud.atlas = Registry.myAtlas;
			#end
			cloud.velocity.x = -110;
			clouds.add(cloud);
			cloud.solid = false;
			if (i > 10)
			{
				cloud.kill();
			}
		}
		bigClouds = new FlxGroup(10);
		for (i in 0...10)
		{
			var bigCloud:FlxSprite = new FlxSprite(Math.random() * (Registry.player.x + 600), Math.random() * 400, "assets/bigcloud" + Std.string(Math.ceil(Math.random() * 2)) + ".png");
			#if (cpp || neko)
				bigCloud.atlas = Registry.myAtlas;
			#end
			bigCloud.velocity.x = -80;
			bigClouds.add(bigCloud);
			bigCloud.solid = false;
			if (i > 6)
			{
				bigCloud.kill();
			}
		}
		
		//Registry.water.manageWaves();
		
		//add(sky);
		//add(sky2);
		//add(bg);
		add(Registry.levelBG.skyBG);
		//add(Registry.levelBG.skyBG2);
		add(Registry.levelBG.parallaxBGS);
		add(Registry.enemyManager);
		add(Registry.effects);
		add(Registry.player.eggBombs);
		add(Registry.player.tentacles);
		add(Registry.player);
		add(Registry.levelBG);
		add(clouds);
		add(bigClouds);
		
		/*var testBuoy:FlxPhysSprite = new FlxPhysSprite(Registry.player.x + 700, Registry.player.y + 200, "assets/buoy.png");
		#if (cpp || neko)
			testBuoy.atlas = Registry.myAtlas;
		#end
		testBuoy.body.shapes.clear();
		testBuoy.body.shapes.add(new Polygon([Vec2.weak( -4, -35), Vec2.weak(4, -35), Vec2.weak(11, 15), Vec2.weak( -11, 15)]));
		var weight:Polygon = new Polygon([Vec2.weak( -5, 27), Vec2.weak(5, 27), Vec2.weak(5, 37), Vec2.weak( -5, 37)]);
		weight.material.density = 100;
		testBuoy.body.shapes.add(weight);
		testBuoy.body.mass = 3.5;
		testBuoy.setBodyMaterial(0, .2, .4, 30, .005);
		//testBuoy.body.localCOM = Vec2.weak(0, 20);
		testBuoy.body.localCOM.y += 35;
		add(testBuoy);*/
		
		for (i in 0...4)
		{
			var testBox:Crate = new Crate(Registry.player.x + Math.random() * 200 - 200, Registry.player.y + Math.random() * 200 - 100);
			//var tM:Float = testBox.body.mass;
			//var tI:Float = testBox.body.inertia;
			//#if (cpp || neko)
				//testBox.atlas = Registry.myAtlas;
			//#end
			//testBox.makeGraphic(50, 13, 0xFF000000);
			//testBox.createRectangularBody();
			//testBox.body.massMode = MassMode.FIXED;
			//testBox.body.mass = 2.8;
			//testBox.body.inertia = tI * 10;
			//testBox.setBodyMaterial(0, .2, .35, 8, .005);
			//var pivot = testBox.body.localCOM.mul(-1);
			//testBox.body.translateShapes(pivot);
			add(testBox);
			//testBox.body.align();
		}
		
		//Testing boat issue
		//testBoat = new FlxSprite(500, 1500, null);
		//testBoat.loadGraphic("assets/smallboat.png", false, true);
		//testBoat.createRectangularBody();
		//testBoat.setBodyMaterial(0, .2, .4, 3.5, .005);
		//testBoat.
		//testBoat.facing = FlxObject.LEFT;
		//add(testBoat);
		
		//var motorboat:MotorBoat = new MotorBoat(700, 1500);
		//add(motorboat);
		
		
		//FlxG.timeScale = .1;
		//FlxG.visualDebug = true;
		
		//Setup Onscreen Controls
		#if mobile
		Registry.analog = new SquidAnalog(105, FlxG.stage.stageHeight - 105, 50);
		add(Registry.analog);
		#end
		#if !FLX_NO_DEBUG
		fpsCounter.cameras = [FlxG.camera];
		//add(fpsCounter);
		#end
		
		//Loading Screen
		
		
		//var gamePad:FlxGamePad = new FlxGamePad(FlxGamePad.NONE, FlxGamePad.A_B_C);
		//add(gamePad);
		gameLoaded = true;
		FlxG._game.removeChild(Registry.loadScreen);
		gameLoader.destroy();
		gameLoader = null;
		Registry.loadScreen = null;
		//Registry.playerLandSound = FlxG.play("Player_Land", 0);
		//Registry.windSound = FlxG.play("Wind_Ambient", .4, true, false);
		//FlxG.log(Registry.myAtlas.height);
	}
}