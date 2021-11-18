package com.pause9.supermegasquid;

import nape.callbacks.CbEvent;
import nape.callbacks.InteractionCallback;
import nape.dynamics.InteractionFilter;
import nape.dynamics.InteractionGroup;
import nape.phys.Body;
import nape.phys.Interactor;
import nme.geom.Point;
import org.flixel.FlxGroup;
import org.flixel.FlxParticle;
import org.flixel.FlxPoint;
import org.flixel.FlxSprite;
import org.flixel.nape.FlxPhysSprite;
import org.flixel.nape.FlxPhysState;
import nape.callbacks.InteractionListener;
import nape.callbacks.InteractionType;
import org.flixel.FlxG;
import nape.geom.Vec2;
import nape.phys.Compound;
import org.flixel.addons.FlxEmitterExt;

class EnemyManager extends FlxGroup
{
	private var swanFilter:InteractionFilter;
	private var balloonFilter:InteractionFilter;
	private var ignoredEnemies:InteractionGroup;
	private var splatters:FlxGroup;
	private var explosions:FlxGroup;
	private var splatParts:FlxGroup;
	private var smallFishes:FlxGroup;
	private var mediumFishes:FlxGroup;
	private var sharks:FlxGroup;
	private var balloons:FlxGroup;
	private var swans:FlxGroup;
	private var gulls:FlxGroup;
	private var motorBoats:FlxGroup;
	private var divers:FlxGroup;
	private var swimmers:FlxGroup;
	private var subs:FlxGroup;
	private var eels:FlxGroup;
	private var planes:FlxGroup;
	private var choppers:FlxGroup;
	
	public function new():Void
	{
		super();
		ignoredEnemies = new InteractionGroup(true);
		//swanFilter = new InteractionFilter(2, ~2 | 4);
		//balloonFilter = new InteractionFilter(4, ~2|4);
		//swanGroup = new InteractionGroup(true);
		
		//Bloodsplatter Animation Object Pool
		splatters = new FlxGroup(10);
		for (i in 0...10)
		{
			var splatter:FlxSprite = new FlxSprite(0, 0);
			splatter.loadGraphic("assets/bloodanim2.png", true, false, 70, 70);
			splatter.centerOffsets();
			#if (cpp || neko)
				splatter.atlas = Registry.myAtlas;
			#end
			splatter.addAnimation("splat", [0, 1, 2, 3, 4, 5], 20, false);
			splatter.kill();
			splatters.add(splatter);
		}
		Registry.effects.add(splatters);
		
		//Explosion Animation Object Pool
		explosions = new FlxGroup(10);
		for (i in 0...10)
		{
			var explo:FlxSprite = new FlxSprite(0, 0);
			explo.loadGraphic("assets/exploanim.png", true, false, 73, 73);
			explo.centerOffsets();
			#if (cpp || neko)
				explo.atlas = Registry.myAtlas;
			#end
			explo.addAnimation("explosion", [0, 1, 2, 3, 4, 5], 20, false);
			explo.kill();
			explosions.add(explo);
		}
		Registry.effects.add(explosions);
		
		//Bloodsplatter Emitter Object Pool
		splatParts = new FlxGroup(10);
		for (i in 0...splatParts.maxSize)
		{
			var splatEmit:FlxEmitterExt = new FlxEmitterExt(0, 0);
			for (j in 0...10)
			{
				var part:FlxParticle = new FlxParticle();
				part.angularAcceleration = 7;
				part.drag = new FlxPoint(.85, .85);
				var size:Int = Std.int(Math.random() * 2 + 4);
				part.makeGraphic(size, size, 0xFFC93D3D);
				#if (cpp || neko)
				part.atlas = Registry.myAtlas;
				#end
				part.acceleration.y = 5;
				part.kill();
				splatEmit.add(part);
			}
			splatEmit.kill();
			splatParts.add(splatEmit);
		}
		Registry.effects.add(splatParts);
		//Create Enemy Pools
		smallFishes = new FlxGroup();
		mediumFishes = new FlxGroup();
		balloons = new FlxGroup();
		sharks = new FlxGroup();
		motorBoats = new FlxGroup();
		swans = new FlxGroup();
		gulls = new FlxGroup();
		swimmers = new FlxGroup();
		divers = new FlxGroup();
		subs = new FlxGroup();
		eels = new FlxGroup();
		planes = new FlxGroup();
		choppers = new FlxGroup();
		for (i in 0...10)
		{
			//Swans
			var newSwan:Swan = new Swan(0, 0);
			newSwan.body.group = ignoredEnemies;
			newSwan.kill();
			swans.add(newSwan);
			//Swans
			var newShark:Shark = new Shark(0, 0);
			newShark.body.group = ignoredEnemies;
			newShark.kill();
			sharks.add(newShark);
			//Gulls
			var newGull:Seagull = new Seagull(0, 0);
			newGull.body.group = ignoredEnemies;
			newGull.kill();
			gulls.add(newGull);
			//Small Fish
			var newSmallFish:SmallFish = new SmallFish(0, 0);
			newSmallFish.body.group = ignoredEnemies;
			newSmallFish.kill();
			smallFishes.add(newSmallFish);
			//Medium Fish
			var newMediumFish:MediumFish = new MediumFish(0, 0);
			newMediumFish.body.group = ignoredEnemies;
			newMediumFish.kill();
			mediumFishes.add(newMediumFish);
			//Balloon
			var newBalloon:Balloon = new Balloon(0, 0);
			newBalloon.body.group = ignoredEnemies;
			newBalloon.kill();
			balloons.add(newBalloon);
			//Motor Boat
			var newMotorBoat:MotorBoat = new MotorBoat(0, 0);
			newMotorBoat.body.group = ignoredEnemies;
			newMotorBoat.kill();
			motorBoats.add(newMotorBoat);
			//Swimmers
			var newSwimmer:Swimmer = new Swimmer(0, 0);
			newSwimmer.body.group = ignoredEnemies;
			newSwimmer.kill();
			swimmers.add(newSwimmer);
			//Divers
			var newDiver:Diver = new Diver(0, 0);
			newDiver.body.group = ignoredEnemies;
			newDiver.kill();
			divers.add(newDiver);
			//Subs
			var newSub:Sub = new Sub(0, 0);
			newSub.body.group = ignoredEnemies;
			newSub.kill();
			subs.add(newSub);
			//Eels
			var newEel:Eel = new Eel(0, 0);
			newEel.body.group = ignoredEnemies;
			newEel.kill();
			eels.add(newEel);
			//Planes
			var newPlane:CargoPlane = new CargoPlane(0, 0);
			newPlane.body.group = ignoredEnemies;
			newPlane.kill();
			planes.add(newPlane);
			//Planes
			var newChopper:Chopper = new Chopper(0, 0);
			newChopper.body.group = ignoredEnemies;
			newChopper.kill();
			choppers.add(newChopper);
		}
		add(smallFishes);
		add(mediumFishes);
		add(sharks);
		add(motorBoats);
		add(swimmers);
		add(divers);
		add(balloons);
		add(swans);
		add(gulls);
		add(subs);
		add(eels);
		add(planes);
		add(choppers);
		var x:Int;
		var y:Int;
		/*for (i in 0...17)
		{
			spawnSwan(Math.random() * 7800 + 600, Math.random() * 1000 + 300);
		}
		for (i in 0...4)
		{	
			x = Std.int(Math.random() * 7800 + 600);
			y = Std.int(Math.random() * 1000 + 300);
			for (i in 0...6)
			{
				spawnSeagull(x + Math.random() * 200 - 100, y + Math.random() * 200 - 100);
			}
		}
		for (i in 0...8)
		{
			spawnBalloon(Math.random() * 7800 + 600, Math.random() * 1000 + 300);
		}
		for (i in 0...12)
		{
			spawnSmallFish(Math.random() * 7800 + 600, Math.random() * 800 + 1800);
		}
		for (i in 0...12)
		{
			spawnMediumFish(Math.random() * 7800 + 600, Math.random() * 800 + 1800);
		}
		for (i in 0...9)
		{
			spawnShark(Math.random() * 7800 + 600, Math.random() * 800 + 1800);
		}*/
		//for (i in 0...7)
		//{
			//spawnHumanSwimmer(Math.random() * 7800 + 600, 1500);
		//}
		//for (i in 0...6)
		//{
			//spawnHumanDiver(Math.random() * 7800 + 600, Math.random () * 1000 + 1600);
		//}
		/*for (i in 0...12)
		{
			spawnMotorBoat(Math.random() * 7800 + 600, 1500);
		}*/
		FlxPhysState.space.listeners.add(new InteractionListener(
            CbEvent.BEGIN,
			InteractionType.COLLISION,
            Registry.PLAYER,
            Registry.SWAN,
           swanHit,
            /*precedence*/ 0
        ));
		FlxPhysState.space.listeners.add(new InteractionListener(
            CbEvent.BEGIN,
			InteractionType.COLLISION,
            Registry.PLAYER,
            Registry.CHOPPER,
           chopperHit,
            /*precedence*/ 0
        ));
		FlxPhysState.space.listeners.add(new InteractionListener(
            CbEvent.BEGIN,
			InteractionType.COLLISION,
            Registry.PLAYER,
            Registry.PLANE,
           planeHit,
            /*precedence*/ 0
        ));
		FlxPhysState.space.listeners.add(new InteractionListener(
            CbEvent.BEGIN,
			InteractionType.COLLISION,
            Registry.TERRAIN,
            Registry.ENEMY_COLLISION,
           enemyTerrain,
            /*precedence*/ 0
        ));
		FlxPhysState.space.listeners.add(new InteractionListener(
            CbEvent.BEGIN,
			InteractionType.COLLISION,
            Registry.EGGBOMB,
            Registry.ENEMY_COLLISION,
           enemyEggBomb,
            /*precedence*/ 0
        ));
		FlxPhysState.space.listeners.add(new InteractionListener(
            CbEvent.BEGIN,
			InteractionType.COLLISION,
            Registry.PLAYER,
            Registry.BOAT,
			boatHit,
            /*precedence*/ 0
        ));
		FlxPhysState.space.listeners.add(new InteractionListener(
            CbEvent.BEGIN,
			InteractionType.COLLISION,
            Registry.PLAYER,
            Registry.BALLOON,
			balloonHit,
            /*precedence*/ 0
        ));
		FlxPhysState.space.listeners.add(new InteractionListener(
            CbEvent.BEGIN,
			InteractionType.COLLISION,
            Registry.PLAYER,
            Registry.FISH,
			fishHit,
            /*precedence*/ 0
        ));
		FlxPhysState.space.listeners.add(new InteractionListener(
            CbEvent.BEGIN,
			InteractionType.COLLISION,
            Registry.PLAYER,
            Registry.SHARK,
			sharkHit,
            /*precedence*/ 0
        ));
		FlxPhysState.space.listeners.add(new InteractionListener(
            CbEvent.BEGIN,
			InteractionType.COLLISION,
            Registry.PLAYER,
            Registry.HUMAN,
			humanHit,
            /*precedence*/ 0
        ));
		FlxPhysState.space.listeners.add(new InteractionListener(
            CbEvent.BEGIN,
			InteractionType.COLLISION,
            Registry.PLAYER,
            Registry.GULL,
			gullHit,
            /*precedence*/ 0
        ));
		FlxPhysState.space.listeners.add(new InteractionListener(
            CbEvent.BEGIN,
			InteractionType.COLLISION,
            Registry.PLAYER,
            Registry.SUB,
			subHit,
            /*precedence*/ 0
        ));
		FlxPhysState.space.listeners.add(new InteractionListener(
            CbEvent.BEGIN,
			InteractionType.COLLISION,
            Registry.PLAYER,
            Registry.EEL,
			subHit,
            /*precedence*/ 0
        ));
	}
	override public function update():Void
	{
		super.update();
		for (i in 0...splatters.length)
		{
			var splat:FlxSprite = cast(splatters.members[i], FlxSprite);
			if (splat.exists && splat.finished)
			{
				splat.kill();
			}
		}
		for (i in 0...explosions.length)
		{
			var explo:FlxSprite = cast(explosions.members[i], FlxSprite);
			if (explo.exists && explo.finished)
			{
				explo.kill();
			}
		}
		/*for (i in 0...length)
		{
			//FlxG.log(members[i]);
			var enemy:Enemy = cast(members[i], Enemy);
			if ( members[i] == null)
			{
				FlxG.log("NULL");
				FlxG.log(members);
			}
			var dx:Float = Math.abs(enemy.x - Registry.player.x);
			var dy:Float = Math.abs(enemy.y - Registry.player.y);
			if (dx > 900 || dy > 900)
			{
				enemy.kill();
			}
		}*/
		controlEnemyCount();
	}
	public function spawnHumanSwimmer(x,y):Void
	{
		if (validate(x,y))
		{
			if (swimmers.getFirstAvailable() != null)
			{
				var swimmer = cast(swimmers.getFirstAvailable(), Enemy);
				swimmer.revive();
				swimmer.body.position.x = x;
				swimmer.body.position.y = y;
				swimmer.x = x;
				swimmer.y = y;
				if (x > Registry.player.x)
				{
					swimmer.dir = -1;
				}
			}
		}
	}
	public function spawnHumanDiver(x,y):Void
	{
		if (validate(x,y))
		{
			if (divers.getFirstAvailable() != null)
			{
				var diver = cast(divers.getFirstAvailable(), Enemy);
				diver.revive();
				diver.body.position.x = x;
				diver.body.position.y = y;
				diver.x = x;
				diver.y = y;
				if (x > Registry.player.x)
				{
					diver.dir = -1;
				}
			}
		}
	}
	public function spawnSub(x,y):Void
	{
		if (validate(x,y))
		{
			if (subs.getFirstAvailable() != null)
			{
				var sub = cast(subs.getFirstAvailable(), Enemy);
				sub.revive();
				sub.body.position.x = x;
				sub.body.position.y = y;
				sub.x = x;
				sub.y = y;
				if (x > Registry.player.x)
				{
					sub.dir = -1;
				}
			}
		}
	}
	public function spawnEel(x,y):Void
	{
		if (validate(x,y))
		{
			if (eels.getFirstAvailable() != null)
			{
				var eel = cast(eels.getFirstAvailable(), Eel);
				eel.revive();
				eel.body.position.x = x;
				eel.body.position.y = y;
				eel.x = x;
				eel.y = y;
				if (x > Registry.player.x)
				{
					eel.dir = -1;
				}
			}
		}
	}
	public function spawnMotorBoat(x,y):Void
	{
		if (validate(x,y))
		{
			if (motorBoats.getFirstAvailable() != null)
			{
				var motorBoat = cast(motorBoats.getFirstAvailable(), MotorBoat);
				motorBoat.revive();
				motorBoat.body.position.x = x;
				motorBoat.body.position.y = y;
				motorBoat.x = x;
				motorBoat.y = y;
				if (x > Registry.player.x)
				{
					motorBoat.dir = -1;
				}
				motorBoat.drawFrame();
			}
		}
	}
	public function spawnSwan(x,y):Void
	{
		if (validate(x,y))
		{
			if (swans.getFirstAvailable() != null)
			{
				var swan = cast(swans.getFirstAvailable(), Enemy);
				swan.revive();
				swan.body.position.x = x;
				swan.body.position.y = y;
				swan.x = x;
				swan.y = y;
				if (x > Registry.player.x)
				{
					swan.dir = -1;
				}
			}
		}
	}
	public function spawnSeagull(x,y):Void
	{
		if (validate(x,y))
		{
			if (gulls.getFirstAvailable() != null)
			{
				var gull = cast(gulls.getFirstAvailable(), Enemy);
				gull.revive();
				gull.body.position.x = x;
				gull.body.position.y = y;
				gull.x = x;
				gull.y = y;
				if (x > Registry.player.x)
				{
					gull.dir = -1;
				}
			}
		}
	}
	public function spawnBalloon(x,y):Void
	{
		if (validate(x,y))
		{
			if (balloons.getFirstAvailable() != null)
			{
				var balloon = cast(balloons.getFirstAvailable(), Enemy);
				balloon.revive();
				balloon.body.position.x = x;
				balloon.body.position.y = y;
				balloon.x = x;
				balloon.y = y;
				if (x > Registry.player.x)
				{
					balloon.dir = -1;
				}
			}
		}
	}
	public function spawnMediumFish(x,y):Void
	{
		if (validate(x,y))
		{
			if (mediumFishes.getFirstAvailable() != null)
			{
				var mediumFish = cast(mediumFishes.getFirstAvailable(), Enemy);
				mediumFish.body.position.x = x;
				mediumFish.body.position.y = y;
				mediumFish.x = x;
				mediumFish.y = y;
				mediumFish.revive();
				if (x > Registry.player.x)
				{
					mediumFish.dir = -1;
				}
			}
		}
	}
	public function spawnSmallFish(x,y, maxSpeed:Float=0):Void
	{
		if (validate(x,y))
		{
			if (smallFishes.getFirstAvailable() != null)
			{
				var smallFish = cast(smallFishes.getFirstAvailable(), Enemy);
				smallFish.body.position.x = x;
				smallFish.body.position.y = y;
				smallFish.x = x;
				smallFish.y = y;
				if (maxSpeed != 0)
				{
					smallFish.maxSpeed = maxSpeed;
				}
				smallFish.revive();
				if (x > Registry.player.x)
				{
					smallFish.dir = -1;
				}
			}
		}
	}
	public function spawnShark(x,y):Void
	{
		if (validate(x,y))
		{
			if (sharks.getFirstAvailable() != null)
			{
				var shark = cast(sharks.getFirstAvailable(), Enemy);
				shark.body.position.x = x;
				shark.body.position.y = y;
				shark.x = x;
				shark.y = y;
				shark.revive();
				if (x > Registry.player.x)
				{
					shark.dir = -1;
				}
			}
		}
	}
	public function spawnPlane(x,y):Void
	{
		if (validate(x,y))
		{
			if (planes.getFirstAvailable() != null)
			{
				var plane = cast(planes.getFirstAvailable(), Enemy);
				plane.body.position.x = x;
				plane.body.position.y = y;
				plane.x = x;
				plane.y = y;
				plane.revive();
				if (x > Registry.player.x)
				{
					plane.dir = -1;
				}
			}
		}
	}
	public function spawnChopper(x,y):Void
	{
		if (validate(x,y))
		{
			if (choppers.getFirstAvailable() != null)
			{
				var chopper = cast(choppers.getFirstAvailable(), Enemy);
				chopper.body.position.x = x;
				chopper.body.position.y = y;
				chopper.x = x;
				chopper.y = y;
				chopper.revive();
				if (x > Registry.player.x)
				{
					chopper.dir = -1;
				}
			}
		}
	}
	private function enemyTerrain(cb:InteractionCallback):Void
	{
		cb.int2.userData.sprite.dir *= -1;
		//FlxG.log(cb.int2.castBody.velocity);
		//cb.int2.castBody.velocity.length = 0;
	}
	private function swanHit(cb:InteractionCallback):Void
	{
		if (killSpeed(cb.int1))
		{
			cb.int2.userData.sprite.kill();
			cb.int2.userData.sprite.deathEffects();
			//playBloodSplat(cb.int2);
			Registry.player.rage += 15;
			//Registry.player.play("chomp");
			//Registry.uiLayer.updateRageBar(Registry.player.rage);
		}
	}
	private function gullHit(cb:InteractionCallback):Void
	{
		if (killSpeed(cb.int1))
		{
			cb.int2.userData.sprite.kill();
			cb.int2.userData.sprite.deathEffects();
			//playBloodSplat(cb.int2);
			Registry.player.rage += 20;
			//Registry.player.play("chomp");
			//Registry.uiLayer.updateRageBar(Registry.player.rage);
		}
	}
	private function eelHit(cb:InteractionCallback):Void
	{
		if (killSpeed(cb.int1))
		{
			cb.int2.userData.sprite.kill();
			cb.int2.userData.sprite.deathEffects();
			//playExplosion(cb.int2);
			//FlxG.play("Metal_Hit", .1);
			Registry.player.rage += 10;
			//Registry.player.play("chomp");
			//Registry.uiLayer.updateRageBar(Registry.player.rage);
		}
	}
	private function boatHit(cb:InteractionCallback):Void
	{
		if (killSpeed(cb.int1))
		{
			cb.int2.userData.sprite.kill();
			cb.int2.userData.sprite.deathEffects();
			//playExplosion(cb.int2);
			//FlxG.play("Metal_Hit", .1);
			Registry.player.rage += 10;
			//Registry.player.play("chomp");
			//Registry.uiLayer.updateRageBar(Registry.player.rage);
		}
	}
	private function planeHit(cb:InteractionCallback):Void
	{
		if (killSpeed(cb.int1))
		{
			cb.int2.userData.sprite.kill();
			cb.int2.userData.sprite.deathEffects();
			Registry.player.rage += 20;
		}
	}
	private function balloonHit(cb:InteractionCallback):Void
	{
		if (killSpeed(cb.int1))
		{
			cb.int2.userData.sprite.kill();
			cb.int2.userData.sprite.deathEffects();
			Registry.player.rage += 25;
			//Registry.player.play("chomp");
			//Registry.uiLayer.updateRageBar(Registry.player.rage);
		}
	}
	private function subHit(cb:InteractionCallback):Void
	{
		if (killSpeed(cb.int1))
		{
			cb.int2.userData.sprite.kill();
			cb.int2.userData.sprite.deathEffects();
			Registry.player.rage += 20;
			//Registry.player.play("chomp");
			//Registry.uiLayer.updateRageBar(Registry.player.rage);
		}
	}
	private function fishHit(cb:InteractionCallback):Void
	{
		if (killSpeed(cb.int1))
		{
			cb.int2.userData.sprite.kill();
			cb.int2.userData.sprite.deathEffects();
			//playBloodSplat(cb.int2);
			Registry.player.rage += 8;
			//Registry.player.play("chomp");
			//Registry.uiLayer.updateRageBar(Registry.player.rage);
		}
	}
	private function humanHit(cb:InteractionCallback):Void
	{
		if (killSpeed(cb.int1))
		{
			Registry.player.humansEaten += 1;
			cb.int2.userData.sprite.kill();
			cb.int2.userData.sprite.deathEffects();
			//playBloodSplat(cb.int2);
			Registry.player.rage += 28;
			//Registry.player.play("chomp");
			//Registry.uiLayer.updateRageBar(Registry.player.rage);
			Registry.uiLayer.updateHumanText();
		}
	}
	private function sharkHit(cb:InteractionCallback):Void
	{
		if (killSpeed(cb.int1))
		{
			cb.int2.userData.sprite.kill();
			cb.int2.userData.sprite.deathEffects();
			//playBloodSplat(cb.int2);
			Registry.player.rage += 15;
			//Registry.player.play("chomp");
			//Registry.uiLayer.updateRageBar(Registry.player.rage);
		}
	}
	private function chopperHit(cb:InteractionCallback):Void
	{
		if (killSpeed(cb.int1))
		{
			cb.int2.userData.sprite.kill();
			cb.int2.userData.sprite.deathEffects();
			//playBloodSplat(cb.int2);
			Registry.player.rage += 15;
			//Registry.player.play("chomp");
			//Registry.uiLayer.updateRageBar(Registry.player.rage);
		}
	}
	private function enemyEggBomb(cb:InteractionCallback):Void
	{
		cb.int2.userData.sprite.kill();
		cb.int2.userData.sprite.deathEffects();
		cb.int1.userData.sprite.kill();
		Registry.player.rage += 15;
		//Registry.uiLayer.updateRageBar(Registry.player.rage);
	}
	private function validate(x,y):Bool
	{
		var valid:Bool = true;
		for (i in 0...Registry.levelBody.bodies.length)
		{
			if (Registry.levelBody.bodies[i].contains(Vec2.weak(x, y)))
			{
				valid = false;
				break;
			}
		}
		return valid;
	}
	private function killSpeed(inter:Interactor):Bool
	{
		var kill:Bool = false;
		if (inter.isCompound())
		{
			inter.castCompound.visitBodies( function(bod) {
				if (bod.castBody.velocity.length > 200 && bod != Registry.player.body)
				{
					kill = true;
				}
			});
		}
		else
		{
			if (inter.castBody.velocity.length > 200)
			{
				kill = true;
			}
		}
		return kill;
	}
	public function playBloodSplat(inter:FlxPhysSprite):Void
	{
		var rand:Int = Std.int(Math.random() * 7);
		if (rand == 2 && !Registry.player.wet)
		{
			FlxG.timeScale = .2;
		}
		//Sound
		FlxG.play("Splat", 1);
		//Splat Animation
		var splat:FlxSprite = cast(splatters.getFirstAvailable(), FlxSprite);
		splat.x = inter.body.position.x - splat.width/2;
		splat.y = inter.body.position.y - splat.height/2;
		splat.revive();
		splat.play("splat", true);
		
		//Splat Particles
		var emit = cast(Registry.enemyManager.splatParts.getFirstAvailable(), FlxEmitterExt);
		emit.x = inter.body.position.x - emit.width/2;
		emit.y = inter.body.position.y - emit.height/2;
		emit.revive();
		emit.setMotion(1, 6, .5, 360, 85, 1.5);
		emit.start(true,1,.09,0);
	}
	public function playExplosion(inter:FlxPhysSprite):Void
	{
		var rand:Int = Std.int(Math.random() * 7);
		if (rand == 2 && !Registry.player.wet)
		{
			FlxG.timeScale = .2;
		}
		//Sound
		FlxG.play("Explosion", .1);
		//Splat Animation
		var explo:FlxSprite = cast(explosions.getFirstAvailable(), FlxSprite);
		explo.x = inter.body.position.x - explo.width/2;
		explo.y = inter.body.position.y - explo.height/2;
		explo.revive();
		explo.play("explosion", true);
		
		/*//Splat Particles
		var emit = cast(Registry.enemyManager.splatParts.getFirstAvailable(), FlxEmitterExt);
		emit.x = inter.castBody.position.x - emit.width/2;
		emit.y = inter.castBody.position.y - emit.height/2;
		emit.revive();
		emit.setMotion(1, 6, .5, 360, 85, 1.5);
		emit.start(true,1,.09,0);*/
	}
	private function controlEnemyCount():Void
	{
		//Add up the number of living enemies from each group
		var living:Int = 0;
		for (i in 0...length)
		{
			living += cast(members[i], FlxGroup).countLiving();
		}
		if (living < 20)
		{
			var side:Float = Math.random() * 2 - 1;
			if (side < 0)
			{
				side = -1;
			}
			else
			{
				side = 1;
			}
			
			//Roll Small Fish Spawn
			var rand:Int = Std.int(Math.random() * 50);
			var maxSpeed:Float = Math.random() * 150 + 150;
			if (rand == 5)
			{
				//Spawn group of small fish
				var sP:Point = new Point(Registry.player.x + (Math.random() * 300 + 700) * side, Math.random() * 800 + 1800);
				spawnSmallFish(sP.x , sP.y, maxSpeed);
				spawnSmallFish(sP.x + Math.random() * 40 + 30, sP.y + Math.random() * 20 + 15, maxSpeed);
				spawnSmallFish(sP.x + Math.random() * 20 + 15, sP.y + Math.random() * 40 + 30, maxSpeed);
				spawnSmallFish(sP.x - Math.random() * 40 + 20, sP.y - Math.random() * 30 + 30, maxSpeed);
			}
			//Roll Shark Spawn
			rand = Std.int(Math.random() * 300);
			if (rand == 5)
			{
				spawnShark(Registry.player.x + (Math.random() * 300 + 700) * side, Math.random() * 800 + 1800);
			}
			//Roll Medium Fish Spawn
			rand = Std.int(Math.random() * 200);
			if (rand == 5)
			{
				spawnMediumFish(Registry.player.x + (Math.random() * 300 + 700) * side, Math.random() * 800 + 1800);
			}
			//Roll Motor Boat Spawn
			rand = Std.int(Math.random() * 200);
			if (rand == 5)
			{
				spawnMotorBoat(Registry.player.x + (Math.random() * 300 + 700) * side, 1350);
			}
			//Roll Balloon Spawn
			rand = Std.int(Math.random() * 200);
			if (rand == 5)
			{
				spawnBalloon(Registry.player.x + (Math.random() * 300 + 700) * side, Math.random() * 1000 + 300);
			}
			//Roll Seagull Spawn
			rand = Std.int(Math.random() * 50);
			if (rand == 5)
			{
				spawnSeagull(Registry.player.x + (Math.random() * 300 + 700) * side, Math.random() * 1000 + 300);
			}
			//Roll Swan Spawn
			rand = Std.int(Math.random() * 100);
			if (rand == 5)
			{
				spawnSwan(Registry.player.x + (Math.random() * 300 + 700) * side, Math.random() * 1000 + 300);
			}
			//Roll Sub Spawn
			rand = Std.int(Math.random() * 300);
			if (rand == 5)
			{
				spawnSub(Registry.player.x + (Math.random() * 300 + 700) * side, Math.random() * 800 + 1800);
			}
			//Roll Human Diver Spawn
			rand = Std.int(Math.random() * 500);
			if (rand == 5)
			{
				spawnHumanDiver(Registry.player.x + (Math.random() * 300 + 700) * side, Math.random() * 800 + 1800);
			}
			//Roll Human Swimmer Spawn
			rand = Std.int(Math.random() * 500);
			if (rand == 5)
			{
				spawnHumanSwimmer(Registry.player.x + (Math.random() * 300 + 700) * side, 1450);
			}
			//Roll Eel Spawn
			rand = Std.int(Math.random() * 300);
			if (rand == 5)
			{
				spawnEel(Registry.player.x + (Math.random() * 300 + 700) * side, Math.random() * 800 + 1800);
			}
			//Roll Plane Spawn
			rand = Std.int(Math.random() * 300);
			if (rand == 5)
			{
				spawnPlane(Registry.player.x + (Math.random() * 300 + 700) * side, Math.random() * 600 + 100);
			}
			//Roll Chopper Spawn
			rand = Std.int(Math.random() * 250);
			if (rand == 5)
			{
				spawnChopper(Registry.player.x + (Math.random() * 300 + 700) * side, Math.random() * 800 + 100);
			}
			
			//var type:Int = Std.int(Math.random() * 4);
			//var side:Float = Math.random() * 2 - 1;
			//if (Registry.player.y > 1400)
			//{
				//spawnWaterEnemy(side, type);
			//}
			//if (Registry.player.y < 1700)
			//{
				//spawnAirEnemy(side, type);
			//}
			//if (Registry.player.y < 1800 && Registry.player.y > 1200)
			//{
				//spawnSurfaceEnemy(side, type);
			//}
			//FlxG.log(members.length);
		}
	}
	//private function spawnWaterEnemy(side:Float, type:Int):Void
	//{
		//switch type {
			//case 0:
				//spawnSmallFish(Registry.player.x + 800 * side, Math.random() * 800 + 1800);
			//case 1:
				//spawnShark(Registry.player.x + 800 * side, Math.random() * 800 + 1800);
			//case 2:
				//spawnMediumFish(Registry.player.x + 800 * side, Math.random() * 800 + 1800);
		//}
	//}
	//private function spawnSurfaceEnemy(side:Float, type:Int):Void
	//{
		//switch type {
			//case 0:
				//spawnMotorBoat(Registry.player.x + 800 * side, 1450);
			//case 1:
				//spawnMotorBoat(Registry.player.x + 800 * side, 1450);
			//case 2:
				//spawnMotorBoat(Registry.player.x + 800 * side, 1450);
		//}
	//}
	//private function spawnAirEnemy(side:Float, type:Int):Void
	//{
		//switch type {
			//case 0:
				//spawnBalloon(Registry.player.x + 800 * side, Math.random() * 1000 + 300);
			//case 1:
				//spawnSeagull(Registry.player.x + 800 * side, Math.random() * 1000 + 300);
			//case 2:
				//spawnSeagull(Registry.player.x + 800 * side, Math.random() * 1000 + 300);
		//}
	//}
	//private function spawnHuman(side:Float, type:Int):Void
	//{
		//switch type {
			//case 0:
				//spawnHumanDiver(Registry.player.x + 800 * side, Math.random() * 800 + 1800);
			//case 1:
				//spawnHumanSwimmer(Registry.player.x + 800 * side, 1450);
		//}
	//}
}