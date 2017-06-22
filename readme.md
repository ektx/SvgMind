# SvgMind.js

使用 D3.js 制作关系图
> use d3.js to create a diagram 

## 使用(Usage)

```html
	<!-- 显示区域(display area) -->
	<section id="my-mind-box"></section>
	<!-- use d3.js -->
	<script src="contents/d3/d3.min.js"></script>
	<!-- use svgmind.js -->
	<script src="js/svgmind.js"></script>
	<script>
		var mymind = new SvgMind();
		
		mymind.ajax({
			url: 'contents/data/data1.json'
		}, (data) => {

			var option = {
				el: '#my-mind-box',
				data: data,
				perHeight: 100,
				perWidth: 200,
				circle: {
					r: 12
				},
				// 是否支持多选, true 多选择 false 单选
				selectedMode: false,
				line: {
					refX: 20
				},
				text: {
					dy: '2.5em',
					dx: '0em'
				}
			}
			mymind.setOption(option);
		});
	</script>
```

## API
-  option
	- perHeight [number] 		每个点之间 y 轴距离
	- perWidth  [number]  		每个点之间 x 轴距离
	- follow	[boolean] 		与父级相持平行,只有在自己的个数比父级的个数少时起用
	- circle	圆的属性
		- r		[number] 		半径大小
	- selectedMode [boolean] 	是否支持多选, true 多选择 false 单选
	- line		连线属性
		- refX	[number] 		箭头的x轴偏移
		- refY 	[number] 		箭头的y轴偏移
	- text		文字属性
		- textAnchor [start | middle | end]  文字位置
		- dy	[number] 		文字的y轴偏移
		- dx 	[number] 		文字的x轴偏移
		- length [number] 		设置文字长度 false 为不限,取值为大于0
	- events 	事件
		- zoom 	[function] 		缩放时的事件
		- zoomEnd [function] 	缩放结束时事件








