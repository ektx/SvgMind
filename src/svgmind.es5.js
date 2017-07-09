/*
	SVG Mind
	--------------------------------
	v 0.4.0

	支持 默认选择功能,多选单选可自由控制
*/
function SvgMind() {

	// 绘制区
	this.el = '';
	// 记录点的位置
	this.pointPosition = {};
	// 记录点的数组
	this.pointArr = [];
	// 选择功能
	this.selected = [];
	
	this.events = {

		dragstarted: (d) => {
			d3.event.sourceEvent.stopPropagation();
			d3.select(this).classed('dragging', true)
		},

		dragged: (d) => {
			d3.select(this)
			.attr('cx', d.x = d3.event.x)
			.attr('cy', d.y = d3.event.y)
		},

		dragged: (d) => {
			d3.select(this).classed('dragging', false)
		},

		/*
			移动与缩放
			-----------------------------------
			@x [number] 偏移量
			@y [number] 偏移量
			@scale [0.1 - 100] 放大系数 0.1 到 100
			@duration [number] 动画时间

			外部调用一:
			mymind.events.transform.call(mymind, 0,0,1)
		*/
		transform: function(x, y, scale, duration) {
			
			duration = duration || 750;

			if (scale == 0) scale = 1;

			this.svg.transition()
			.duration(duration)
			.call(
				this.zoom.transform, 
				d3.zoomIdentity.translate(x, y)
				.scale(scale)
			)
		},

		myZoom: function() {
			// 设置缩放比例
			this.zoom = d3.zoom()
			.scaleExtent([0, 100])
			.on('zoom', ()=> {
				this.svgBody
				.attr('transform', 'translate(' + d3.event.transform.x + ',' + d3.event.transform.y + ') scale(' + d3.event.transform.k + ')');

			} )
			.on('end', ()=> {
				this.zoomScale = d3.event.transform.k;

				if (this.option.events.zoomEnd) {
					if (typeof this.option.events.zoomEnd == 'function') {
						this.option.events.zoomEnd(d3.event.transform.k)
					}
				}
			});


			this.svg.call( this.zoom);			
		},

		selectFn: function() {

			if (this.selected.length > 0) {
				
				var _classList = this.selected.join(',');
				if (this.option.selectedMode) {
					d3.selectAll(_classList).classed('focus', true)
				} else {
					d3.select(_classList).classed('focus', true)
				}
			}
		}
	}


	this.option = {
		/* 箭头方向 
			left:  指向左 <
			right: 指向右 >
			none: 无
		*/
		arrow: {
			start: "none",
			end: "left"
		},
		// 每个点之间 y 轴距离
		perHeight: 100,
		// 每个点之间 x 轴距离
		perWidth: 200,
		// 与父级相持平行,只有在自己的个数比父级的个数少时起用
		follow: true,
		// 圆的属性
		circle: {
			// 半径
			r: 12
		},
		// 是否支持多选, true 多选择 false 单选, -1 不可以选择
		selectedMode: false,
		// 连线属性
		line: {
			// 箭头的x轴偏移
			refX: 0,
			// 箭头的y轴偏移
			refY: 0
		},
		text: {
			// 文字位置 start | middle | end 
			textAnchor: 'middle',
			// 文字的y轴偏移
			dy: 0,
			// 文字的x轴偏移
			dx: 0,
			// 设置文字长度 false 为不限,取值为大于0
			length: false
		},

		events: {
			zoom: null, // 缩放时的事件
			zoomEnd: null // 缩放结束时事件
		}
	}
}

SvgMind.prototype = {
	/*
		基础版本 ajax
	*/
	ajax: function(option, callback) {
		var xhr,
			method = option.method || 'get',
			url = option.url || false;

		if (!url) return;

		xhr = new XMLHttpRequest();
		xhr.open(method, url, true);
		xhr.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200) {
				if (callback) callback(JSON.parse(this.responseText))
			}
		}

		xhr.send()		
	},

	/*
		添加 json 合并功能
	*/
	extendObj: function(obj, obj2) {
		var findObj = function(_obj, _obj2) {

			for (var key in _obj2) {

				if (typeof _obj2[key] == 'object') {
					if ( !_obj.hasOwnProperty(key) ) {

						_obj[key] = _obj2[key]
					} else {
						// get 组合过的
						_obj[key] = findObj(_obj[key], _obj2[key])
					}
					
				}
				else {
					_obj[key] = _obj2[key]
				}

			}

			return _obj
		}


		return findObj(obj, obj2)	
	},

	// 绘制贝塞尔曲线
	diagonal: function(s, t) {
		s.y = parseFloat(s.y);
		s.x = parseFloat(s.x);
		t.y = parseFloat(t.y);
		t.x = parseFloat(t.x);

		return 'M'+ s.y +','+s.x
		+ 'C' + (s.y + t.y) /2 + ',' + s.x
		+ ' ' + (s.y + t.y) /2 + ',' + t.x
		+ ' ' + t.x +',' + t.y;
	},


	/* 
		获取每级的个数 
	*/
	getType: function() {
	
		var typeArrIndex = 0;

		var doWith = (json, parentId) => {
			for (var i = 0, l = json.length; i < l; i++) {
				var _data = json[i];
				var _child = _data.child;
				var _id = _data.id;

				if (json[i].select) {
					this.selected.push( '#'+_id )
				}

				if (_child) {
					typeArrIndex++;
					doWith( _child, _id )
				}

				// 生成数组
				if (!this.pointArr[typeArrIndex]) {
					this.pointArr[typeArrIndex] = []
				}

				// 判断是否已经存在
				if (!(_id in this.pointPosition)) {

					this.pointArr[typeArrIndex].push(_id);

					this.pointPosition[_id] = {
						_self: this.extendObj(this.option.data.data[_id], _data),
						_parent: [ parentId ]
					}

				} else {
					// 追加父级信息
					this.pointPosition[_id]._parent.push( parentId )
				}
			}

			typeArrIndex--;
		}

		doWith( this.option.data.line );

	},

	// 绘制线
	drawLine: function(json) {

		var _self = this;

		json.forEach(function(n,i) {

			var thisPoint = d3.select('#'+n.id+' .nodes-point')

			if (n.child) {
				
				var lineBox = d3.select('#'+n.id)
				.insert('g', '.nodes-point')
				.classed('node-line-box', true);

				// 生成线
				for (var i = 0, l = n.child.length; i < l; i++) {
					var childNodePoint = d3.select('#'+n.child[i].id+' .nodes-point');

					lineBox.append('line')
					// 添加箭头
					.classed('end-solid-arrow', true)
					// 添加线的属性
					.classed(`${n.child[i].type}-line`, true) 
					.attr('x1', thisPoint.attr('cx'))
					.attr('y1', thisPoint.attr('cy'))
					.attr('x2', childNodePoint.attr('cx'))
					.attr('y2', childNodePoint.attr('cy'));

					// lineBox.append('path')
					// .attr('d', _self.diagonal(
					// 	{x: thisPoint.attr('cx'), y: thisPoint.attr('cy')},
					// 	{x: childNodePoint.attr('cy'), y: childNodePoint.attr('cx')}
					// ))
				}

				_self.drawLine( n.child )

			}

		})
	},

	/*
		添加文件
	*/
	drawText: function(ele, text, x, y) {

		var setTxtL = this.option.text.length;

		ele.append('title').text(text)

		if (setTxtL) {
			var textR = text.replace(/[^\x00-\xff]/g, '❤❤');
			if (textR.length > setTxtL) {
				if (textR.slice(setTxtL, setTxtL+1) == '❤') {
					var _t = textR.slice(0, setTxtL);
					var xinL = _t.match(/❤/g).length;
					var _tL = _t.length - xinL;
					text = text.slice(0, _tL + Math.floor(xinL/2))+'...'
				} else {
					text = text.slice(0, setTxtL)+'...'
				}
			}
		}

		ele
			.append('text')
			.text( text )
			.attr('text-anchor', this.option.text.textAnchor)
			.attr('x', x)
			.attr('y', y)
			.attr('dy', this.option.text.dy)
			.attr('dx', this.option.text.dx)
	},

	// 绘制点
	drawPoint: function() {

		var _self = this;
		var linkArr = _self.pointArr;

		// 取x, y
		var getParentOption = (parentArr) => {
			var xArr = [];
			var yArr = [];

			for (var i = 0, l = parentArr.length; i < l; i++) {
				var _parent = _self.pointPosition[parentArr[i]]._self;

				xArr.push( _parent.x );
				yArr.push( _parent.y );
			}

			var xMax = Math.max.apply({}, xArr);
			var xMin = Math.min.apply({}, xArr);

			var yMax = Math.max.apply({}, yArr);
			var yMin = Math.min.apply({}, yArr);

			return {
				x: (xMax - xMin) / 2 + xMin,
				y: (yMax - yMin) / 2 + yMin
			}

		}

		var addClassList = (classtag) => {

			var _cls = 'nodes-point'

			if (classtag) {
				_cls += ' ' + classtag;
			} 

			return _cls;

		}

		for (var i = 0, l = linkArr.length; i < l; i++) {
			
			var colH = (linkArr[i].length -1) * _self.option.perHeight / 2;
			var colW = (linkArr.length -1) * _self.option.perWidth / 2;

			for (var n = 0, m = linkArr[i].length; n < m; n++) {

				// 得到自己的 id
				var _thisID = linkArr[i][n];
				var _thisInfo = _self.pointPosition[_thisID]._self;
				var x = i * _self.option.perWidth + (_self.svgW/2) - colW;
				var y = n * _self.option.perHeight + (_self.svgH/2) - colH;

				if (i > 0) {
					// 如果要让点与父级平行
					if (_self.option.follow && linkArr[i].length < linkArr[i -1].length) {
						// 得到父级的信息
						var _parentID = _self.pointPosition[_thisID]._parent;
						var _parent = getParentOption(_parentID);

						x = _parent.x + _self.option.perWidth;
						y = _parent.y;
					} 
				}

				// 保存点的位置
				_thisInfo.x = x;
				_thisInfo.y = y;
				
				var circleBox = _self.svgBody.append('g')
				.attr('id', _thisID)
				.classed('nodes-box', true)
				
				circleBox.append('circle')
				.attr('class', addClassList(_thisInfo.class))
				.attr('r', _self.circleR)
				.attr('cx', x)
				.attr('cy', y)
				.on('mouseover', function() {
					d3.select(this.previousSibling).classed('hover', true)
				})
				.on('mouseout', function() {
					d3.select(this.previousSibling).classed('hover', false)
				})
				.on('click', function() {

					if (_self.option.selectedMode < 0) return;

					var className = 'focus';
					var _this = d3.select(this);

					if (!this.parentNode.matches(`.${className}`)) {
						if ( !_self.option.selectedMode ) {
							d3.selectAll('.focus').classed('focus', false)
						}
					}

					// 选择效果
					this.parentNode.classList.toggle('focus');

				});

				this.drawText(circleBox, _thisInfo.name, x, y)

			}
		};
	},

	// 绘制 marker
	drawMarker: function() {

		var markerBox = this.svgBody.append('svg:defs');
		var arrowArr = ['end-arrow', 'end-hover-arrow','end-focus-arrow','start-arrow', 'start-hover-arrow']
		var line = this.option.line;
		var refX = line ? (line.refX || 0): 0;
		var refY = line ? (line.refY || 0): 0;

		for (var i = 0, l = arrowArr.length; i < l; i++) {
			markerBox
			.append('svg:marker')
			.classed('arrow-ico', true)
			.attr('id', arrowArr[i])
			.attr('viewBox', '0 -5 10 10')
			.attr('refX', refX)
			.attr('refY', refY)
			.attr('markerWidth', 10)
			.attr('markerHeight', 10)
			.attr('orient', 'auto')
			.append('svg:path')
			.attr('d', 'M0,-5L10,0L0,5')
		}
	},

	init: function(option) {

		var _self = this;

		this.option = this.extendObj( this.option, option );

		_self.getType();

		// 计算最多个数行
		var maxTypeLength = Math.max.apply({}, (function() {
			var _arr = [];
			for (var i = 0, l = _self.pointArr.length; i < l; i++) {
				_arr.push( _self.pointArr[i].length );
			}
			return _arr;
		})());

		this.svgBox = d3.select( this.option.el );
		this.svgW = parseInt( this.svgBox.style('width') );
		this.svgH = parseInt( this.svgBox.style('height') );
		this.circleR = option.circle.r;

		this.svg = this.svgBox.append('svg')
		.attr('width', this.svgW)
		.attr('height', this.svgH);

		this.svgBody = this.svg.append('g');
	},

	setOption: function(option) {

		this.init( option );

		this.drawMarker();

		this.drawPoint();

		this.drawLine(this.option.data.line);

		// 默认选择效果
		this.events.selectFn.call(this)

		// 添加默认事件
		this.events.myZoom.call(this)

		// 拖动圆
		// d3.selectAll('circle').call(d3.drag().on('start', started))

	}
}

// function started() {
  // var circle = d3.select(this).classed("dragging", true);

  // d3.event.on("drag", dragged).on("end", ended);

  // function dragged(d) {
  //   circle.raise().attr("cx", d3.event.x).attr("cy", d3.event.y);
  // }

  // function ended() {
  //   circle.classed("dragging", false);
  // }
// }

