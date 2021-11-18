package com.pause9.supermegasquid;

import browser.display.Sprite;
import nme.display.Bitmap;
import nme.geom.Point;
import org.flixel.system.input.FlxAnalog;
import org.flixel.FlxSprite;
import org.flixel.FlxG;
import nme.Assets;
import org.flixel.FlxGroup;
import org.flixel.system.input.FlxTouch;
import org.flixel.FlxPoint;
import nme.geom.Rectangle;
import org.flixel.FlxU;


class SquidAnalog extends FlxGroup
{
	// From radians to degrees.
	private static inline var DEGREES:Float = (180 / Math.PI);

	// Used with public variable <code>status</code>, means not highlighted or pressed.
	private static inline var NORMAL:Int = 0;
	// Used with public variable <code>status</code>, means highlighted (usually from mouse over).
	private static inline var HIGHLIGHT:Int = 1;
	// Used with public variable <code>status</code>, means pressed (usually from mouse click).
	private static inline var PRESSED:Int = 2;		
	// Shows the current state of the button.
	public var status:Int;

	// X position of the upper left corner of this object in world space.
	public var x:Float;
	// Y position of the upper left corner of this object in world space.
	public var y:Float;

	// An list of analogs that are currently active.
	private static var _analogs:Array<SquidAnalog>;
	// The current pointer that's active on the analog.
	private var _currentTouch:FlxTouch;
	// Helper array for checking touches
	private var _tempTouches:Array<FlxTouch>;
	// Helper FlxPoint object
	private var _point:FlxPoint;

	// This function is called when the button is released.
	public var onUp:Void->Void;
	// This function is called when the button is pressed down.
	public var onDown:Void->Void;
	// This function is called when the mouse goes over the button.
	public var onOver:Void->Void;
	// This function is called when the button is hold down.
	public var onPressed:Void->Void;

	// The area which the joystick will react.
	private var _pad:Rectangle;
	// The background of the joystick, also known as the base.
	private var _base:FlxSprite;
	// The thumb 
	public var _stick:FlxSprite;

	// The radius where the thumb can move.
	private var _radius:Float;
	public var _direction:Float;
	private var _amount:Float;		

	// How fast the speed of this object is changing.
	public var acceleration:FlxPoint;
	// The speed of easing when the thumb is released.
	private var _ease:Float;
	
	private var _baseBit:Bitmap;
	private var _stickBit:Bitmap;
	private var _lungeBit:Bitmap;
	private var _spinBit:Bitmap;

	/**
	 * Constructor
	 * @param	X		The X-coordinate of the point in space.
 	 * @param	Y		The Y-coordinate of the point in space.
 	 * @param	radius	The radius where the thumb can move. If 0, the background will be use as radius.
 	 * @param	ease	The duration of the easing. The value must be between 0 and 1.
	 */
	public function new(X:Float, Y:Float, Radius:Float = 0, Ease:Float = 0.25):Void
	{
		super();

		x = X;
		y = Y;
		_radius = Radius;
		_ease = Ease;

		if (_analogs == null)
		{
			_analogs = new Array<SquidAnalog>();
		}
		_analogs.push(this);

		status = NORMAL;
		_direction = 0;
		_amount = 0;
		acceleration = new FlxPoint();

		_tempTouches = [];
		_point = new FlxPoint();

		createBase();
		createThumb();
		createZone();
		
		createLungeButton();
		createSpinButton();
	}

	private function createBase():Void 
	{
		//_base = new FlxSprite(x, y).loadGraphic("assets/joystickoutside.png");
		_baseBit = new Bitmap(Assets.getBitmapData("assets/joystickoutside.png", false));
		FlxG._game.addChildAt(_baseBit, 2);
		//_base.cameras = [FlxG.camera];
		_baseBit.x = x-_baseBit.width * .5;
		_baseBit.y = y-_baseBit.height * .5;
		//_base.scrollFactor.x = _base.scrollFactor.y = 0;
		//_base.solid = false;
		//_base.ignoreDrawDebug = true;
		//add(_base);
	}
	private function createThumb():Void
	{
		//_stick = new FlxSprite(x, y).loadGraphic("assets/joystickinside.png");
		_stickBit = new Bitmap(Assets.getBitmapData("assets/joystickinside.png", false));
		FlxG._game.addChildAt(_stickBit, 3);
		_stickBit.x = x-_stickBit.width * .5;
		_stickBit.y = y-_stickBit.height * .5;
		//_stick.cameras = [FlxG.camera];
		//_stick.scrollFactor.x = _stick.scrollFactor.y = 0;
		//_stick.solid = false;
		//_stick.ignoreDrawDebug = true;
		//add(_stick);
	}
	private function createLungeButton():Void
	{
		_lungeBit = new Bitmap(Assets.getBitmapData("assets/lungebutton.png"));
		FlxG._game.addChildAt(_lungeBit, 4);
		_lungeBit.x = FlxG.stage.stageWidth-_lungeBit.width-20;
		_lungeBit.y = FlxG.stage.stageHeight-_lungeBit.height-20;
	}
	private function createSpinButton():Void
	{
		_spinBit = new Bitmap(Assets.getBitmapData("assets/spinbutton.png"));
		FlxG._game.addChildAt(_spinBit, 5);
		_spinBit.x = FlxG.stage.stageWidth-_spinBit.width-20;
		_spinBit.y = FlxG.stage.stageHeight-_spinBit.height-40-_lungeBit.height;
	}
	/**
	 * Creates the touch zone. It's based on the size of the background. 
	 * The thumb will react when the mouse is in the zone.
	 * Override this to customize the zone.
	 */
	private function createZone():Void
	{
		if (_radius == 0)			
		{
			_radius = _base.width / 2;
		}
		_pad = new Rectangle(x - _radius, y - _radius, 2 * _radius, 2 * _radius);
	}

	/**
	 * Clean up memory.
	 */
	override public function destroy():Void
	{
		super.destroy();
		_analogs = null;
		onUp = null;
		onDown = null;
		onOver = null;
		onPressed = null;
		acceleration = null;
		_stick = null;
		_base = null;
		_pad = null;

		_currentTouch = null;
		_tempTouches = null;
		_point = null;
	}

	/**
	 * Update the behavior. 
	 */
	override public function update():Void 
	{
		var touch:FlxTouch = null;
		var offAll:Bool = true;

		// There is no reason to get into the loop if their is already a pointer on the analog
		if (FlxG.supportsTouchEvents)
		{
			//FlxG._game.removeChildAt(2);
			//FlxG._game.removeChildAt(2);
			if (_currentTouch != null)
			{
				_tempTouches.push(_currentTouch);
			}
			else
			{
				for (touch in FlxG.touchManager.touches)
				{
					//DEBUG TOUCH POSITION
					//Registry.uiLayer.graphics.beginFill(0xFFFFFF);
					//var p:FlxPoint = touch.getScreenPosition(FlxG.camera);
					//Registry.uiLayer.graphics.drawCircle(p.x * FlxG.camera.zoom, p.y * FlxG.camera.zoom, 30);
					//Registry.uiLayer.graphics.endFill();
					var touchInserted:Bool = false;
					for (analog in _analogs)
					{
						// check whether the pointer is already taken by another analog.
						// TODO: check this place. This line was 'if (analog != this && analog._currentTouch != touch && touchInserted == false)'
						if (analog == this && analog._currentTouch != touch && touchInserted == false) 
						{		
							_tempTouches.push(touch);
							touchInserted = true;
						}
					}
				}
			}
			var i:Int = 0;
			for (touch in FlxG.touchManager.touches)
			{
				_point = touch.getScreenPosition(FlxG.camera, _point);
				_point.x *= FlxG.camera.zoom;
				_point.y *= FlxG.camera.zoom;
				//Registry.uiLayer.graphics.drawCircle(500, 500, 30);
				updateButtons(_point, touch, i);
			}
			for (touch in _tempTouches)
			{
				_point = touch.getScreenPosition(FlxG.camera, _point);
				_point.x *= FlxG.camera.zoom;
				_point.y *= FlxG.camera.zoom;
				if (updateAnalog(_point, touch.pressed(), touch.justPressed(), touch.justReleased(), touch) == false)
				{
					offAll = false;
					//break;
				}
			}
		}
		else
		{
			_point.x = FlxG.mouse.screenX;
			_point.y = FlxG.mouse.screenY;

			if (updateAnalog(_point, FlxG.mouse.pressed(), FlxG.mouse.justPressed(), FlxG.mouse.justReleased()) == false)
			{
				offAll = false;
			}
		}

		if ((status == HIGHLIGHT || status == NORMAL) && _amount != 0)
		{
			_amount *= _ease;
			if (Math.abs(_amount) < 0.1) 
			{
				_amount = 0;
			}
		}

		_stickBit.x = x + Math.cos(_direction) * _amount * _radius - (_stickBit.width * 0.5);
		_stickBit.y = y + Math.sin(_direction) * _amount * _radius - (_stickBit.height * 0.5);

		if (offAll)
		{
			status = NORMAL;
		}

		_tempTouches.splice(0, _tempTouches.length);
		super.update();
	}
	private function updateButtons(touchPoint:FlxPoint, touch:FlxTouch = null, i):Void
	{
		if (touch != null)
		{
			//touchPoint.x = touch.screenX;
			//touchPoint.y = touch.screenY;
		}
		if (touch.justPressed() && Math.abs(touchPoint.x - _lungeBit.x - _lungeBit.width / 2) < 53 && Math.abs(touchPoint.y - _lungeBit.y - _lungeBit.height / 2) < 46)
		{
			Registry.player.lunge(_direction);
		}
		if (touch.justPressed() && Math.abs(touchPoint.x - _spinBit.x - _spinBit.width / 2) < 53 && Math.abs(touchPoint.y - _spinBit.y - _spinBit.height / 2) < 46)
		{
			Registry.player.activateSpin();
		}
	}
	private function updateAnalog(touchPoint:FlxPoint, pressed:Bool, justPressed:Bool, justReleased:Bool, touch:FlxTouch = null):Bool
	{
		var offAll:Bool = true;

		// Use the touch to figure out the world position if it's passed in, as 
		// the screen coordinates passed in touchPoint are wrong
		// if the control is used in a group, for example.
		if (touch != null)
		{
			//touchPoint.x = touch.screenX;
			//touchPoint.y = touch.screenY;
		}

		if (_pad.contains(touchPoint.x, touchPoint.y) || (status == PRESSED))
		{
			offAll = false;

			if (pressed)
			{
				if (touch != null)
				{
					_currentTouch = touch;
				}
				status = PRESSED;			
				if (justPressed)
				{
					if (onDown != null)
					{
						onDown();
					}
				}						

				if (status == PRESSED)
				{
					if (onPressed != null)
					{
						onPressed();						
					}

					var dx:Float = touchPoint.x - x;
					var dy:Float = touchPoint.y - y;

					var dist:Float = Math.sqrt(dx * dx + dy * dy);
					if (dist < 1) 
					{
						dist = 0;
					}
					_direction = Math.atan2(dy, dx);
					_amount = FlxU.min(_radius, dist) / _radius;

					acceleration.x = Math.cos(_direction) * _amount * _radius;
					acceleration.y = Math.sin(_direction) * _amount * _radius;			
				}					
			}
			else if (justReleased && status == PRESSED)
			{				
				_currentTouch = null;
				status = HIGHLIGHT;
				if (onUp != null)
				{
					onUp();
				}
				acceleration.x = 0;
				acceleration.y = 0;
			}					

			if (status == NORMAL)
			{
				status = HIGHLIGHT;
				if (onOver != null)
				{
					onOver();
				}
			}
		}

		return offAll;
	}

	/**
	 * Returns the angle in degrees.
	 * @return	The angle.
	 */
	public function getAngle():Float
	{
		return Math.atan2(acceleration.y, acceleration.x) * DEGREES;
	}

	/**
	 * Whether the thumb is pressed or not.
	 */
	public function pressed():Bool
	{
		return status == PRESSED;
	}

	/**
	 * Whether the thumb is just pressed or not.
	 */
	public function justPressed():Bool
	{
		if (FlxG.supportsTouchEvents)
		{
			return _currentTouch.justPressed() && status == PRESSED;
		}
		return FlxG.mouse.justPressed() && status == PRESSED;
	}

	/**
	 * Whether the thumb is just released or not.
	 */
	public function justReleased():Bool
	{
		if (FlxG.supportsTouchEvents)
		{
			return _currentTouch.justReleased() && status == HIGHLIGHT;
		}
		return FlxG.mouse.justReleased() && status == HIGHLIGHT;
	}

	/**
	 * Set <code>alpha</code> to a number between 0 and 1 to change the opacity of the analog.
	 * @param Alpha
	 */
	public function setAlpha(Alpha:Float):Void
	{
		_base.alpha = Alpha;
		_stick.alpha = Alpha;
	}

}

/*class SquidAnalog extends FlxAnalog
{
	private var _baseBit:Bitmap;
	private var _stickBit:Bitmap;
	
	public function new(x:Float = 0, y:Float = 0, radius:Float = 0, ease:Float = 0)
	{
		super(x, y, radius, ease);
	}
	override public function update():Void
	{
		super.update();
	}
	override private function createBase():Void 
	{
		//_base = new FlxSprite(x, y).loadGraphic("assets/joystickoutside.png");
		_baseBit = new Bitmap(Assets.getBitmapData("assets/joystickoutside.png"));
		FlxG._game.addChildAt(_baseBit, 2);
		//_base.cameras = [FlxG.camera];
		_baseBit.x = x-_baseBit.width * .5;
		_baseBit.y = y-_baseBit.height * .5;
		//_base.scrollFactor.x = _base.scrollFactor.y = 0;
		//_base.solid = false;
		//_base.ignoreDrawDebug = true;
		//add(_base);
	}
	override private function createThumb():Void
	{
		_stick = new FlxSprite(x, y).loadGraphic("assets/joystickinside.png");
		_stickBit = new Bitmap(Assets.getBitmapData("assets/joystickinside.png"));
		FlxG._game.addChildAt(_stickBit, 3);
		_stickBit.x = x-_stickBit.width * .5;
		_stickBit.y = y-_stickBit.height * .5;
		_stick.cameras = [FlxG.camera];
		_stick.scrollFactor.x = _stick.scrollFactor.y = 0;
		_stick.solid = false;
		_stick.ignoreDrawDebug = true;
		add(_stick);
	}
}*/