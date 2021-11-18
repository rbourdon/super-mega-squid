package com.pause9.supermegasquid;

import nape.geom.Ray;
import nme.display.BitmapInt32;
import org.flixel.nape.FlxPhysSprite;
import org.flixel.nape.FlxPhysState;
import nape.dynamics.InteractionGroup;
import nape.phys.Body;
import nape.phys.Compound;
import nape.shape.Polygon;
import org.flixel.FlxGroup;
import org.flixel.FlxPoint;
import org.flixel.FlxG;
import nape.phys.BodyType;
import nape.constraint.PivotJoint;
import nape.geom.Vec2;
import nape.phys.MassMode;
import nape.dynamics.InteractionFilter;
import org.flixel.FlxSprite;
import nape.phys.InertiaMode;
import nme.geom.ColorTransform;
//import nape.symbolic.SymbolicConstraint;

class Player extends FlxPhysSprite
{
	public var canMove:Bool;
	public var tentacles:FlxGroup;
	private var tGroup:InteractionGroup;
	public var lungePower:Int;
	public var tComp:Compound;
	public static var power:Int;
	public var wet:Bool;
	private var rageMax:Int;
	public var rage:Int;
	private var rageTimer:Int;
	public var spinTimer:Int;
	public var humansEaten:Int;
	public var canLunge:Bool;
	private var bombTimer:Int;
	public var eggBombs:FlxGroup;
	private var pendingBombs:Int;
	private var ray:Ray;
	
	public function new()
	{
		super(1350, 500);
		canMove = false;
		wet = false;
		lungePower = 100;
		pendingBombs = 0;
		power = 3;
		rageMax = 200;
		spinTimer = 0;
		rage = rageMax;
		rageTimer = 14;
		humansEaten = 0;
		canLunge = false;
		loadGraphic("assets/playeranim.png", true, false, 25, 27);
		addAnimation("chomp", [0, 1, 0], 7, false);
		addAnimation("closeMouth", [1, 0], 5, false);
		#if (cpp || neko)
			atlas = Registry.myAtlas;
		#end
		antialiasing = true;
		tComp = new Compound();
		createCircularBody(13);
		body.space = FlxPhysState.space;
		//body.position.setxy(400, 50);
		//setDrag(1, 1);
		body.position.x = 1350;
		body.position.y = 500;
		//trace(body.mass);
		//trace(body.inertia);
		body.cbTypes.add(Registry.PLAYERHEAD);
		body.cbTypes.add(Registry.PLAYER);
		//body.allowRotation = false;
		//body.massMode = MassMode.FIXED;
		//body.mass = 20;
		//body.inertiaMode = InertiaMode.FIXED;
		//body.inertia = 130;
		//var filt:InteractionFilter = new InteractionFilter(4,~8);
		tGroup = new InteractionGroup(true);
		body.group = tGroup;
		//trace(body.mass);
		//trace(body.inertia);
		setBodyMaterial(.1, .1, .4, 10, .01);
		tentacles = new FlxGroup();
		ray = new Ray(body.position,body.velocity);
		//body.allowRotation = false;
		createTentacles();
		create();
	}
	private function create()
	{
		//FlxG.log("launch bomb");
		//Egg Bomb Pool
		eggBombs = new FlxGroup(20);
		for ( i in 0...20)
		{
			var eggBomb:EggBomb = new EggBomb(0, 0);
			//eggBomb.createRectangularBody(20, 20);
			eggBomb.kill();
			eggBombs.add(eggBomb);
		}
	}
	override public function update()
	{
		//FlxG.log(Registry.analog._direction);
		super.update();
		jaws();
		#if mobile
		if (Math.abs(Registry.analog.acceleration.x) > 0 || Math.abs(Registry.analog.acceleration.y) > 0)
		{
			if (spinTimer <= 0)
			{
				body.rotation = Registry.analog._direction;
			}
		}
		#end
		if (body.position.y < 0 && body.position.x < 60)
		{
			body.position.x = 60;
			body.velocity.x = 200;
		}
		else if (body.position.y < 0 && body.position.x > 8637)
		{
			body.position.x = 8637;
			body.velocity.x = -200;
		}
		if (rageTimer <= 0 && rage > 0)
		{
			if (rage > rageMax)
			{
				rage = rageMax;
			}
			rage -= 1;
			rageTimer = 11;
			Registry.uiLayer.updateRageBar(rage);
		}
		else
		{
			rageTimer --;
		}
		if (spinTimer > 0)
		{
			spin();
			spinTimer --;
		}
		if (FlxG.timeScale < 1)
		{
			FlxG.timeScale += .01;
		}
		if (pendingBombs > 0 && bombTimer <= 0)
		{
			launchBomb();
			bombTimer = 9;
		}
		else if (bombTimer > 0)
		{
			bombTimer --;
		}
	}
	public function lunge(dir:Float=0):Void
	{
		//body.velocity.length *= .1;
		/*var vel:Vec2 = body.velocity.copy();
		vel.length = 1;
		if (dir != 0)
		{
			vel.angle = dir;
			//body.velocity.angle = dir;
		}
		if (canMove == false)
		{
			//vel = body.velocity.normalise();
			vel = vel.mul(2000);
			//body.applyImpulse(vel);
			body.velocity = body.velocity.add(vel);
			//Registry.player.body.applyImpulse(Registry.player.body.velocity.mul(1500)); // += 2700;
		}
		else
		{
			//vel = body.velocity.normalise();
			vel = vel.mul(2300);
			//body.applyImpulse(vel);
			body.velocity = body.velocity.add(vel);
			//body.velocity.x += 10000;
			//body.velocity.y += 10000;
			//Registry.player.body.applyImpulse(Registry.player.body.velocity.mul(3800)); 
			//Registry.player.body.velocity.length += 850;
		}*/
		if (canLunge)
		{
			var vel:Vec2;
			if (canMove)
			{
				vel = Vec2.weak(15000, 15000);	
			}
			else
			{
				canLunge = false;
				vel = Vec2.weak(14000, 14000);
			}
			//if (dir != 0)
			//{
				vel.angle = dir;
				//body.velocity.angle = dir;
			//}
			//else
			//{
				//vel.angle = body.velocity.angle;
			//}
			//vel.length = 1;
			//vel = vel.add();
			//vel.angle = dir;
			body.applyImpulse(vel);
			tComp.bodies.foreach(function(obj) {
				if (obj != body)
				{
					//obj.velocity = body.velocity.mul( -2);
					obj.velocity.length = 1;
					//if (obj.bounds.width < 15)
					//{
						//obj.velocity = obj.velocity.add(vel.mul(.01));
					//}
				}
				else
				{
					//obj.velocity.add(vel);
				}
			});
		}
	}
	private function spin():Void
	{
		var pow:Int;
		if (wet)
		{
			pow = 20;
		}
		else
		{
			pow = 10;
		}
		//Registry.player.body.velocity..length += 2000;
		if (Registry.player.body.velocity.y > 0)
		{
			Registry.player.body.velocity.y *= .2; // = Registry.player.body.velocity.mul(.5);
		}
		Registry.player.body.applyAngularImpulse(pow*13);
		//Registry.player.body.applyAngularImpulse(13000, false);
		//Registry.player.
		//Registry.player.tComp.rotate(Vec2.get(Registry.player.body.position.x, Registry.player.body.position.y), 3);
		Registry.player.tComp.bodies.foreach(function(obj) {
			if (obj != Registry.player.body)
			{
				//obj.velocity.angle = ang; // + 1.6;
				//obj.velocity.length *= .98;
				//obj.applyImpulse(Vec2.fromPolar(5000, Math.random() * 6.28, true));
				//var spin:Vec2 = new Vec2();
				//spin.angle = ang;
				//obj.rotate(Registry.player.body.position, Math.random() * 6.28);
				//obj.angularVel = 0;
				var dx:Float = obj.position.x - Registry.player.body.position.x;
				var dy:Float = obj.position.y - Registry.player.body.position.y;
				var rads:Float = Math.atan2(dy, dx);
				var vec:Vec2 = Vec2.fromPolar(1, rads, true);
				vec = vec.perp();
				obj.applyImpulse(vec.mul(pow * 7, true));
				vec = Vec2.weak(Math.random() * 60 - 30, Math.random() * 60 - 30);
				obj.applyImpulse(vec.mul(pow, true));
				
				//obj.velocity = Vec2.weak(0, 0);
			
			}
		});
	}
	private function launchBomb():Void
	{
		//FlxG.log("Launch Bomb");
		var bomb:FlxPhysSprite = cast(eggBombs.getFirstAvailable(), FlxPhysSprite);
		if (bomb != null)
		{
			bomb.body.position.x = x + 10;
			bomb.body.position.y = y + 10;
			pendingBombs --;
			bomb.revive();
		}
	}
	public function activateSpin():Void
	{
		spinTimer = 10;
		FlxG.play("Spin", .4);
	}
	public function activateEggBombs():Void
	{
		pendingBombs = 6;
	}
	private function createTentacles():Void
	{	
		var b:FlxPhysSprite;
		var b2:FlxPhysSprite;
		var b3:FlxPhysSprite;
		var b4:FlxPhysSprite;
		var filt:InteractionFilter = new InteractionFilter(2);
		var pJ:PivotJoint;
		tComp.cbTypes.add(Registry.PLAYER);
		tComp.group = tGroup;
		tComp.space = FlxPhysState.space;
		//Create Tentacle 1
		//Part 1
		b = new FlxPhysSprite();
		b.makeGraphic(22, 8, 0xFF000000);
		#if (cpp || neko)
			b.atlas = Registry.myAtlas;
		#end
		b.createRectangularBody();
		b.setBodyMaterial(.5, .2, .4, 8, .01);
		b.body.position.x = body.position.x + Math.random() * 140 - 70;
		b.body.position.y = body.position.y + Math.random() * 140 - 70;
		//b.body.massMode = MassMode.FIXED;
		//b.body.mass = .5;
		b.body.setShapeFilters(filt);
		var pJ:PivotJoint = new PivotJoint(body, b.body, Vec2.weak( -width / 2 + 5, -8) , Vec2.weak( -9, 0));
		pJ.space = FlxPhysState.space;
		//pJ.stiff = false;
		b.body.compound = tComp;
		tentacles.add(b);
		//b.body.cbTypes.add(Registry.PLAYER);
		
		//Part 2
		var b2:FlxPhysSprite = new FlxPhysSprite(b.body.position.x, b.body.position.y);
		b2.makeGraphic(18, 7, 0xFF000000);
		#if (cpp || neko)
			b2.atlas = Registry.myAtlas;
		#end
		b2.createRectangularBody();
		b2.setBodyMaterial(.5, .2, .4, 6, .01);
		b2.body.position.x = b.body.position.x;
		b2.body.position.y = b.body.position.y;
		//b2.body.massMode = MassMode.FIXED;
		//b2.body.mass = .5;
		b2.body.setShapeFilters(filt);
		pJ = new PivotJoint(b.body, b2.body, Vec2.weak( 10, 0), Vec2.weak(-8, 0));
		pJ.space = FlxPhysState.space;
		//pJ.stiff = true;
		b2.body.compound = tComp;
		tentacles.add(b2);
		//b2.body.cbTypes.add(Registry.PLAYER);
		
		//Part 3
		var b3:FlxPhysSprite = new FlxPhysSprite(b2.body.position.x, b2.body.position.y);
		b3.makeGraphic(15, 5, 0xFF000000);
		#if (cpp || neko)
			b3.atlas = Registry.myAtlas;
		#end
		b3.createRectangularBody();
		b3.setBodyMaterial(.5, .2, .4, 6, .01);
		b3.body.position.x = b2.body.position.x;
		b3.body.position.y = b2.body.position.y;
		//b3.body.massMode = MassMode.FIXED;
		//b3.body.mass = .5;
		b3.body.setShapeFilters(filt);
		pJ = new PivotJoint(b2.body, b3.body, Vec2.weak( 7, 0), Vec2.weak(-6, 0));
		pJ.space = FlxPhysState.space;
		//pJ.stiff = true;
		b3.body.compound = tComp;
		tentacles.add(b3);
		//b3.body.cbTypes.add(Registry.PLAYER);
		
		//Part 4
		var b4:FlxPhysSprite = new FlxPhysSprite(b3.body.position.x, b3.body.position.y);
		b4.makeGraphic(14, 3, 0xFF000000);
		#if (cpp || neko)
			b4.atlas = Registry.myAtlas;
		#end
		b4.createRectangularBody();
		b4.setBodyMaterial(.5, .2, .4, 7, .01);
		b4.body.position.x = b3.body.position.x;
		b4.body.position.y = b3.body.position.y;
		//b4.body.massMode = MassMode.FIXED;
		//b4.body.mass = .5;
		b4.body.setShapeFilters(filt);
		pJ = new PivotJoint(b3.body, b4.body, Vec2.weak( 6, 0), Vec2.weak(-6, 0));
		pJ.space = FlxPhysState.space;
		//pJ.stiff = false;
		b4.body.compound = tComp;
		tentacles.add(b4);
		//b4.body.cbTypes.add(Registry.PLAYER);
		
		
		
		//Create Tentacle 2
		//Part 1
		b = new FlxPhysSprite();
		b.makeGraphic(20, 8, 0xFF000000);
		#if (cpp || neko)
			b.atlas = Registry.myAtlas;
		#end
		b.createRectangularBody();
		b.setBodyMaterial(.5, .2, .4, 8, .01);
		b.body.position.x = body.position.x + Math.random() * 140 - 70;
		b.body.position.y = body.position.y + Math.random() * 140 - 70;
		//b.body.massMode = MassMode.FIXED;
		//b.body.mass = 1;
		b.body.setShapeFilters(filt);
		pJ = new PivotJoint(body, b.body, Vec2.weak(-width/2 + 5,-3) , Vec2.weak(-9,0));
		pJ.space = FlxPhysState.space;
		b.body.compound = tComp;
		tentacles.add(b);
		//b.body.cbTypes.add(Registry.PLAYER);
		
		//Part 2
		b2 = new FlxPhysSprite(b.body.position.x, b.body.position.y);
		b2.makeGraphic(18, 7, 0xFF000000);
		#if (cpp || neko)
			b2.atlas = Registry.myAtlas;
		#end
		b2.createRectangularBody();
		b2.setBodyMaterial(.5, .2, .4, 6, .01);
		b2.body.position.x = b.body.position.x;
		b2.body.position.y = b.body.position.y;
		//b2.body.massMode = MassMode.FIXED;
		//b2.body.mass = 1;
		b2.body.setShapeFilters(filt);
		pJ = new PivotJoint(b.body, b2.body, Vec2.weak( 9, 0), Vec2.weak( -8, 0));
		pJ.space = FlxPhysState.space;
		//pJ.stiff = false;
		b2.body.compound = tComp;
		tentacles.add(b2);
		//b2.body.cbTypes.add(Registry.PLAYER);
		
		//Part 3
		b3 = new FlxPhysSprite(b2.body.position.x, b2.body.position.y);
		b3.makeGraphic(15, 5, 0xFF000000);
		#if (cpp || neko)
			b3.atlas = Registry.myAtlas;
		#end
		b3.createRectangularBody();
		b3.setBodyMaterial(.5, .2, .4, 6, .01);
		b3.body.position.x = b2.body.position.x;
		b3.body.position.y = b2.body.position.y;
		//b3.body.massMode = MassMode.FIXED;
		//b3.body.mass = 1;
		b3.body.setShapeFilters(filt);
		pJ = new PivotJoint(b2.body, b3.body, Vec2.weak( 7, 0), Vec2.weak(-6, 0));
		pJ.space = FlxPhysState.space;
		//pJ.stiff = false;
		b3.body.compound = tComp;
		tentacles.add(b3);
		//b3.body.cbTypes.add(Registry.PLAYER);
		
		//Part 4
		b4 = new FlxPhysSprite(b3.body.position.x, b3.body.position.y);
		b4.makeGraphic(14, 3, 0xFF000000);
		#if (cpp || neko)
			b4.atlas = Registry.myAtlas;
		#end
		b4.createRectangularBody();
		b4.setBodyMaterial(.5, .2, .4, 7, .01);
		b4.body.position.x = b3.body.position.x;
		b4.body.position.y = b3.body.position.y;
		//b4.body.massMode = MassMode.FIXED;
		//b4.body.mass = 1;
		b4.body.setShapeFilters(filt);
		pJ = new PivotJoint(b3.body, b4.body, Vec2.weak( 6, 0), Vec2.weak(-6, 0));
		pJ.space = FlxPhysState.space;
		//pJ.stiff = false;
		b4.body.compound = tComp;
		tentacles.add(b4);
		//b4.body.cbTypes.add(Registry.PLAYER);
			
		
		//Create Tentacle 3
		//Part 1
		b = new FlxPhysSprite();
		b.makeGraphic(20, 8, 0xFF000000);
		#if (cpp || neko)
			b.atlas = Registry.myAtlas;
		#end
		b.createRectangularBody();
		b.setBodyMaterial(.5, .2, .4, 8, .01);
		b.body.position.x = body.position.x + Math.random() * 140 - 70;
		b.body.position.y = body.position.y + Math.random() * 140 - 70;
		//b.body.massMode = MassMode.FIXED;
		//b.body.mass = 1;
		b.body.setShapeFilters(filt);
		pJ = new PivotJoint(body, b.body, Vec2.weak(-width/2 + 5,3) , Vec2.weak(-9,0));
		pJ.space = FlxPhysState.space;
		b.body.compound = tComp;
		tentacles.add(b);
		//b.body.cbTypes.add(Registry.PLAYER);
		
		//Part 2
		b2 = new FlxPhysSprite(b.body.position.x, b.body.position.y);
		b2.makeGraphic(18, 7, 0xFF000000);
		#if (cpp || neko)
			b2.atlas = Registry.myAtlas;
		#end
		b2.createRectangularBody();
		b2.setBodyMaterial(.5, .2, .4, 6, .01);
		b2.body.position.x = b.body.position.x;
		b2.body.position.y = b.body.position.y;
		//b2.body.massMode = MassMode.FIXED;
		//b2.body.mass = 1;
		b2.body.setShapeFilters(filt);
		pJ = new PivotJoint(b.body, b2.body, Vec2.weak( 9, 0), Vec2.weak(-8, 0));
		pJ.space = FlxPhysState.space;
		//pJ.stiff = false;
		b2.body.compound = tComp;
		tentacles.add(b2);
		//b2.body.cbTypes.add(Registry.PLAYER);
		
		//Part 3
		b3 = new FlxPhysSprite(b2.body.position.x, b2.body.position.y);
		b3.makeGraphic(15, 5, 0xFF000000);
		#if (cpp || neko)
			b3.atlas = Registry.myAtlas;
		#end
		b3.createRectangularBody();
		b3.setBodyMaterial(.5, .2, .4, 6, .01);
		b3.body.position.x = b2.body.position.x;
		b3.body.position.y = b2.body.position.y;
		//b3.body.massMode = MassMode.FIXED;
		//b3.body.mass = 1;
		b3.body.setShapeFilters(filt);
		pJ = new PivotJoint(b2.body, b3.body, Vec2.weak( 7, 0), Vec2.weak(-6, 0));
		pJ.space = FlxPhysState.space;
		//pJ.stiff = false;
		b3.body.compound = tComp;
		tentacles.add(b3);
		//b3.body.cbTypes.add(Registry.PLAYER);
		
		//Part 4
		b4 = new FlxPhysSprite(b3.body.position.x, b3.body.position.y);
		b4.makeGraphic(14, 3, 0xFF000000);
		#if (cpp || neko)
			b4.atlas = Registry.myAtlas;
		#end
		b4.createRectangularBody();
		b4.setBodyMaterial(.5, .2, .4, 7, .01);
		b4.body.position.x = b3.body.position.x;
		b4.body.position.y = b3.body.position.y;
		//b4.body.massMode = MassMode.FIXED;
		//b4.body.mass = 1;
		b4.body.setShapeFilters(filt);
		pJ = new PivotJoint(b3.body, b4.body, Vec2.weak( 6, 0), Vec2.weak(-6, 0));
		pJ.space = FlxPhysState.space;
		//pJ.stiff = false;
		b4.body.compound = tComp;
		tentacles.add(b4);
		//b4.body.cbTypes.add(Registry.PLAYER);
		
		//Create Tentacle 4
		//Part 1
		b = new FlxPhysSprite();
		b.makeGraphic(22, 8, 0xFF000000);
		#if (cpp || neko)
			b.atlas = Registry.myAtlas;
		#end
		b.createRectangularBody();
		b.setBodyMaterial(.5, .2, .4, 8, .01);
		b.body.position.x = body.position.x + Math.random() * 140 - 70;
		b.body.position.y = body.position.y + Math.random() * 140 - 70;
		//b.body.massMode = MassMode.FIXED;
		//b.body.mass = 1;
		b.body.setShapeFilters(filt);
		pJ = new PivotJoint(body, b.body, Vec2.weak(-width/2 + 5,8) , Vec2.weak(-9,0));
		pJ.space = FlxPhysState.space;
		b.body.compound = tComp;
		tentacles.add(b);
		//b.body.cbTypes.add(Registry.PLAYER);
		
		//Part 2
		b2 = new FlxPhysSprite(b.body.position.x, b.body.position.y);
		b2.makeGraphic(18, 7, 0xFF000000);
		#if (cpp || neko)
			b2.atlas = Registry.myAtlas;
		#end
		b2.createRectangularBody();
		b2.setBodyMaterial(.5, .2, .4, 6, .01);
		b2.body.position.x = b.body.position.x;
		b2.body.position.y = b.body.position.y;
		//b2.body.massMode = MassMode.FIXED;
		//b2.body.mass = 1;
		b2.body.setShapeFilters(filt);
		pJ = new PivotJoint(b.body, b2.body, Vec2.weak( 10, 0), Vec2.weak(-8, 0));
		pJ.space = FlxPhysState.space;
		//pJ.stiff = false;
		b2.body.compound = tComp;
		tentacles.add(b2);
		//b2.body.cbTypes.add(Registry.PLAYER);
		
		//Part 3
		b3 = new FlxPhysSprite(b2.body.position.x, b2.body.position.y);
		b3.makeGraphic(15, 5, 0xFF000000);
		#if (cpp || neko)
			b3.atlas = Registry.myAtlas;
		#end
		b3.createRectangularBody();
		b3.setBodyMaterial(.5, .2, .4, 6, .01);
		b3.body.position.x = b2.body.position.x;
		b3.body.position.y = b2.body.position.y;
		//b3.body.massMode = MassMode.FIXED;
		//b3.body.mass = 1;
		b3.body.setShapeFilters(filt);
		pJ = new PivotJoint(b2.body, b3.body, Vec2.weak( 7, 0), Vec2.weak(-6, 0));
		pJ.space = FlxPhysState.space;
		//pJ.stiff = false;
		b3.body.compound = tComp;
		tentacles.add(b3);
		//b3.body.cbTypes.add(Registry.PLAYER);
		
		//Part 4
		b4 = new FlxPhysSprite(b3.body.position.x, b3.body.position.y);
		b4.makeGraphic(14, 3, 0xFF000000);
		#if (cpp || neko)
			b4.atlas = Registry.myAtlas;
		#end
		b4.createRectangularBody();
		b4.setBodyMaterial(.5, .2, .4, 7, .01);
		b4.body.position.x = b3.body.position.x;
		b4.body.position.y = b3.body.position.y;
		//b4.body.massMode = MassMode.FIXED;
		//b4.body.mass = 1;
		b4.body.setShapeFilters(filt);
		pJ = new PivotJoint(b3.body, b4.body, Vec2.weak( 6, 0), Vec2.weak(-6, 0));
		pJ.space = FlxPhysState.space;
		//pJ.stiff = false;
		b4.body.compound = tComp;
		tentacles.add(b4);
		//b4.body.cbTypes.add(Registry.PLAYER);
	}
	private function jaws():Void
	{
		ray.origin.set(body.position);
        ray.direction.set(body.velocity);
        ray.maxDistance = 200; // cast as far as 1000px
        //ray.direction.rotate( -0.5);
		ray.direction.angle = body.rotation - .50;
		var found:Bool = false;
		var filt:InteractionFilter = new InteractionFilter(3, ~2);
		for (i in 0...3) {
            ray.direction.rotate(0.50);
			var result = FlxPhysState.space.rayCast(
				ray,
				/*inner*/ false,
				filt
			);
			//FlxG.log(result);
			if (result != null) {
				var collision = ray.at(result.distance);
				//var sprite:FlxSprite = cast(result.shape.body.userData.sprite, FlxSprite);
				//FlxG.log(sprite.color);
				//sprite.color = 0xC93D3D;
				//sprite.calcFrame();
				//sprite.color = 0xFFFFFF;
				//if (sprite.color == 0xFFFFFF)
				//{
					//sprite.color = 0xC93D3D;
					//sprite.pixels.colorTransform(sprite.pixels.rect, new ColorTransform(1, 1, 1, 1, 100, -185, -185, 0));
					//sprite.calcFrame();
				//}
				#if !FLX_NO_DEBUG
				if (FlxPhysState._physDbgSpr != null)
				{
					//FlxG.log(FlxPhysState._physDbgSpr);
					FlxPhysState._physDbgSpr.drawLine(ray.origin, collision, 0xaa00);
					// Draw circle at collision point, and collision normal.
					//FlxPhysState._physDbgSpr.drawFilledCircle(collision, 3, 0xaa0000);
					FlxPhysState._physDbgSpr.drawLine(
						collision,
						collision.addMul(result.normal, 15, true),
						0xaa0000
					);
				}
				collision.dispose();
				#end

				// release result object to pool.
				result.dispose();
				found = true;
			}
		}
		if (found && frame == 0)
		{
			frame = 1;
		}
		else if (!found && frame == 1)
		{
			play("closeMouth");
		}
        /*for (i in 0...20) {
            ray.direction.rotate(0.05);
 
            var result
 
            if (result != null) {
                var collision = ray.at(result.distance);
				//do stuff
                collision.dispose();
 
                // release result object to pool.
                result.dispose();
            }
        }*/
	}
}