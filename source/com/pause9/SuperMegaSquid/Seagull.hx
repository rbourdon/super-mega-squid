package com.pause9.supermegasquid;

import org.flixel.FlxObject;
import nape.geom.Vec2;

class Seagull extends Enemy
{
	public function new(x,y):Void
	{
		super(x,y);
		loadGraphic("assets/seagullanim.png", true, true, 20, 9);
		//var anim = new FlxAnim("swan", [0, 1], 3, true);
		addAnimation("gull", [0, 1], 3, true);
		play("gull", true);
		#if (cpp || neko)
			atlas = Registry.myAtlas;
		#end
		body.position.x = x;
		body.position.y = y;
		body.gravMass = 0;
		//body.mass = 4;
		body.allowRotation = false;
		facing = FlxObject.RIGHT;
		body.userData.sprite = this;
		body.cbTypes.add(Registry.GULL);
		body.cbTypes.add(Registry.ENEMY_COLLISION);
		maxSpeed = Math.random() * 100 + 200;
		power = Math.random() * 5 + 3.5;
	}
	override public function update():Void
	{
		super.update();
		if (Math.abs(body.velocity.y) > 3)
		{
			body.velocity.y *= .9;
		}
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