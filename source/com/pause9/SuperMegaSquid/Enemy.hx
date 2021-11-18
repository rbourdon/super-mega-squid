package com.pause9.supermegasquid;

import org.flixel.FlxObject;
import org.flixel.nape.FlxPhysSprite;
import nape.geom.Vec2;

class Enemy extends FlxPhysSprite
{
	private var maxHealth:Int;
	public var power:Float;
	public var dir:Int;
	public var maxSpeed:Float;
	override public function new(x,y):Void
	{
		super(x, y);
		dir = 1;
		power = 0;
		maxHealth = 1;
		maxSpeed = 0;
	}
	override public function update():Void
	{
		super.update();
		if (dir == 1)
		{
			if (facing == FlxObject.LEFT)
			{
				facing = FlxObject.RIGHT;
				body.velocity.x = 0;
			}
		}
		else
		{
			if (facing == FlxObject.RIGHT)
			{
				facing = FlxObject.LEFT;
				body.velocity.x = 0;
			}
		}
		var dx:Float = Math.abs(x - Registry.player.x);
		var dy:Float = Math.abs(y - Registry.player.y);
		if (alive)
		{
			if (dx > 1200 || dy > 1500)
			{
				kill();
			}
		}
		if (color == 0xC93D3D)
		{
			color = 0xFFFFFF;
		}
	}
	override public function revive():Void
	{
		super.revive();
		body.velocity = Vec2.weak(0, 0);
		body.rotation = 0;
	}
}