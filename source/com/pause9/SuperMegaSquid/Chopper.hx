package com.pause9.supermegasquid;

import org.flixel.FlxObject;
import nape.geom.Vec2;

class Chopper extends Enemy
{
	public function new(x,y)
	{
		super(x,y);
		loadGraphic("assets/helicopteranim.png", true, true, 121, 32);
		addAnimation("fly", [0, 1], 20, true);
		play("fly");
		createRectangularBody();
		#if (cpp || neko)
			atlas = Registry.myAtlas;
		#end
		body.position.x = x;
		body.position.y = y;
		body.gravMass = 0;
		//body.mass = 4;
		//body.allowRotation = false;
		body.userData.sprite = this;
		body.cbTypes.add(Registry.CHOPPER);
		body.cbTypes.add(Registry.ENEMY_COLLISION);
		power = 70;
		maxSpeed = Math.random() * 100 + 200;
		maxHealth = 1;
		dir = 1;
		health = maxHealth;
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
			body.rotation = .4 * dir;
		}
		body.angularVel *= .85;
	}
	public function deathEffects()
	{
		Registry.enemyManager.playExplosion(this);
	}
}