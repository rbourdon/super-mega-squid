package com.pause9.supermegasquid;

import org.flixel.FlxObject;
import nape.geom.Vec2;

class Eel extends Enemy
{
	public function new(x,y):Void
	{
		super(x, y);
		var rand:Int = Std.int(Math.random() * 3 + 1);
		loadGraphic("assets/electriceelanim.png", true, true, 125, 33);
		addAnimation("swim", [0, 1, 2], 4, true);
		addAnimation("electrify", [3, 4, 5], 4, false);
		play("swim");
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
		body.cbTypes.add(Registry.FISH);
		body.cbTypes.add(Registry.ENEMY_COLLISION);
		power = 105;
		maxSpeed = Math.random() * 250 + 150;
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
		var rand:Int = Std.int(Math.random() * 180);
		if (rand == 5)
		{
			play("electrify");
		}
		if (finished)
		{
			play("swim");
		}
	}
	public function deathEffects()
	{
		Registry.enemyManager.playBloodSplat(this);
	}
}