package com.pause9.supermegasquid;

import org.flixel.FlxObject;
import nape.geom.Vec2;
import org.flixel.FlxG;

class Shark extends Enemy
{
	public function new(x,y):Void
	{
		super(x, y);
		var rand:Int = Std.int(Math.random() * 3 + 1);
		loadGraphic("assets/shark" + Std.string(rand) + ".png", false, true);
		createRectangularBody();
		setBodyMaterial(.5, .2, .4, 7, .005);
		#if (cpp || neko)
			atlas = Registry.myAtlas;
		#end
		body.position.x = x;
		body.position.y = y;
		//body.gravMass = 0;
		//body.mass = 6;
		body.allowRotation = false;
		body.userData.sprite = this;
		body.cbTypes.add(Registry.SHARK);
		body.cbTypes.add(Registry.ENEMY_COLLISION);
		dir = 1;
		power = 85;
		maxSpeed = Math.random() * 150 + 150;
	}
	override public function update():Void
	{
		super.update();
		var g:Float = Std.int(Math.random() * 1000);
		if (g == 5)
		{
			dir *= -1;
		}
		if (body.velocity.length < maxSpeed)
		{
			body.applyImpulse(Vec2.weak(power * dir, 0));
		}
	}
	public function deathEffects()
	{
		Registry.enemyManager.playBloodSplat(this);
	}
}