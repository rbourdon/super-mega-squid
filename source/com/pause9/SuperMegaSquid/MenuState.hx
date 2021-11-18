package com.pause9.supermegasquid;

import nme.Assets;
import nme.geom.Rectangle;
import nme.net.SharedObject;
//import org.flixel.FlxButton;
import org.flixel.FlxG;
import org.flixel.FlxPath;
import org.flixel.FlxSave;
import org.flixel.FlxSprite;
import org.flixel.FlxState;
import org.flixel.FlxText;
//import org.flixel.FlxU;
import nme.ui.Mouse;
import org.flixel.FlxPoint;

class MenuState extends FlxState
{
	private var playButton:CustomButton;
	private var menuBar:FlxSprite;
	private var bg:FlxSprite;
	
	override public function create():Void
	{
		#if !neko
		FlxG.bgColor = 0xffffffff;
		#else
		FlxG.camera.bgColor = {rgb: 0xffffff, a: 0xff};
		#end		
		Mouse.hide();
		FlxG.mouse.hide();
		#if !mobile
		FlxG.mouse.show();
		//FlxG.mouse.hide();
		#end
		
		bg = new FlxSprite( 0, 0, "assets/menubg.png");
		bg.x = -(bg.width - FlxG.width) / 2;
		bg.y = -(bg.height - FlxG.height) / 2;
		bg.antialiasing = true;
		add(bg);
		
		playButton = new CustomButton(0, 0, onPlay, "assets/playbutton.png", "assets/playbuttondown.png", "assets/playbuttondown.png");
		playButton.graphic.x = FlxG.width / 2 - playButton.graphic.width / 2;
		playButton.graphic.y = FlxG.height / 2 - playButton.graphic.height / 2 + 85;
		add(playButton);
		
		menuBar = new FlxSprite( -240, FlxG.height - 75, "assets/menubar.png");
		menuBar.x = -(menuBar.width - FlxG.width) / 2;
		menuBar.antialiasing = true;
		add(menuBar);
		
		//var playButton:FlxButton = new FlxButton(0, 0, null, onPlay);
		//playButton.x = FlxG.width / 2 - playButton.width / 2;
		//playButton.y = FlxG.height / 2 - playButton.height / 2;
		//playButton.scale.x = 3;
		//playButton.scale.y = 3;
		//var playText:FlxText = new FlxText(0, 0, FlxG.width, "PLAY");
		//playText.setFormat(null, 30, 0x000000, "center");
		//playText.y = FlxG.height / 2 - playText.height / 2 + 2;
		//add(playButton);
		//add(playText);
	}
	override public function update():Void
	{
		super.update();
	}
	private function onPlay():Void 
	{
		FlxG.switchState(new PlayState());
	}
	override public function destroy():Void 
	{
		remove(menuBar);
		menuBar.pixels.dispose();
		menuBar = null;
		remove(bg);
		bg.pixels.dispose();
		bg = null;
		super.destroy();
	}
}