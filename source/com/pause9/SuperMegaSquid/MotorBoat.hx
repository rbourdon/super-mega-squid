package com.pause9.supermegasquid;

import org.flixel.FlxObject;
import nape.geom.Vec2;
import nape.shape.Polygon;

class MotorBoat extends Enemy
{
	public function new(x,y):Void
	{
		super(x,y);
		loadGraphic("assets/smallboat.png", false, true);
		//createRectangularBody();
		body.shapes.clear();
		body.shapes.add(new Polygon([Vec2.weak(-32, 8), Vec2.weak(-32, 0), Vec2.weak( -10, -5), Vec2.weak(10, -5), Vec2.weak(32, 0), Vec2.weak(32, 8)]));
		setBodyMaterial(0, .2, .4, 3.3, .05);
		#if (cpp || neko)
			atlas = Registry.myAtlas;
		#end
		body.position.x = x;
		body.position.y = y;
		//body.gravMass = 0;
		//body.mass = 6;
		body.userData.sprite = this;
		body.cbTypes.add(Registry.BOAT);
		body.cbTypes.add(Registry.ENEMY_COLLISION);
		power = 10;
		maxSpeed = Math.random() * 100 + 100;
	}
	override public function update():Void
	{
		super.update();
		body.angularVel *= .85;
		var g:Float = Std.int(Math.random() * 1000);
		if (g == 5)
		{
			dir *= -1;
		}
		if (body.velocity.length < maxSpeed)
		{
			body.applyImpulse(Vec2.weak(power*dir, 0));
		}
	}
	public function deathEffects()
	{
		Registry.enemyManager.playExplosion(this);
	}
}