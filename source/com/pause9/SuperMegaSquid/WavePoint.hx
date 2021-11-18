package com.pause9.supermegasquid;

import org.flixel.FlxPoint;

class WavePoint extends FlxPoint
{
	public var range:Float;
	public var angle:Float;
	public var inc:Float;
	public var startPoint:Float;
	
	public function new(x,y)
	{
		super(x,y);
		startPoint = y;
		range = Math.random() * 40 + 15;
		angle = Math.random();
		inc = Math.random() * 0.020 + .013;
	}
}