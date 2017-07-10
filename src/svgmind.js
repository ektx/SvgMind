/*
	SVG Mind
	--------------------------------
	v 0.5.1

	支持 默认选择功能,多选单选可自由控制

	API
	https://github.com/ektx/SvgMind
*/
class SvgMind {

	constructor() {
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
					
					let _classList = this.selected.join(',');
					if (this.option.selectedMode === 'multiple') {
						d3.selectAll(_classList).classed('focus', true)
					} else {
						d3.select(_classList).classed('focus', true)
					}
				}
			}
		}


		this.option = {
			/* 箭头方向  *
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
			// 圆的属性
			circle: {
				// 半径
				r: 12
			},
			// 是否支持选中, multiple 多选择; single 单选, false 不可以选择(默认)
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

			// 大小窗口*
			autoWindows: true, 

			events: {
				zoom: null, // 缩放时的事件
				zoomEnd: null // 缩放结束时事件
			}
		}
	}

	/*
		基础版本 ajax
	*/
	ajax(option, callback) {
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
	}

	/*
		添加 json 合并功能
	*/
	extendObj(obj, obj2) {
		let findObj = function(_obj, _obj2) {

			for (let key in _obj2) {

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
	}

	// 绘制贝塞尔曲线
	diagonal(s, t) {
		s.y = parseFloat(s.y);
		s.x = parseFloat(s.x);
		t.y = parseFloat(t.y);
		t.x = parseFloat(t.x);

		return 'M'+ s.y +','+s.x
		+ 'C' + (s.y + t.y) /2 + ',' + s.x
		+ ' ' + (s.y + t.y) /2 + ',' + t.x
		+ ' ' + t.x +',' + t.y;
	}


	/* 
		获取每级的个数 
	*/
	getType() {

		let _ = this;
		let data = _.option.data.data;

		for ( let val in data) {

			let _thisArr = data[val];

			if(! _.pointArr[ parseInt(data[val].level) ] ) {
				_.pointArr[ parseInt(data[val].level) ] = []
			}

			data[val].id = val;
			data[val].position = {
				x: 0,
				y: 0
			};

			if (data[val].selected) _.selected.push('#'+val);

			_.pointArr[ parseInt(data[val].level) ].push( data[val] )
		}

		_.pointArr.shift();

		_.pointArr = _.pointArr.filter(n => n)

	}

	// 绘制线
	drawLine() {

		let _self = this;

		let rootData = _self.option.data.data;

		let svgLineTo = (id) => {
			// 1.在当前点区域添加线存放区域
			let lineBox = d3.select('#'+id)
			.insert('g', '.nodes-point')
			.classed('node-line-box', true);


			for (let innerNode in rootData[id].lineTo) {

				// 2.添加线
				lineBox.append('line')
				// 添加箭头
				.classed('end-solid-arrow', true)
				// 添加线的属性
				.classed(`${rootData[id].lineTo[innerNode]}-line`, true) 
				.attr('x1', rootData[id].position.x)
				.attr('y1', rootData[id].position.y)
				.attr('x2', rootData[innerNode].position.x)
				.attr('y2', rootData[innerNode].position.y);

				// lineBox.append('path')
				// .attr('d', _self.diagonal(
				// 	{x: thisPoint.attr('cx'), y: thisPoint.attr('cy')},
				// 	{x: childNodePoint.attr('cy'), y: childNodePoint.attr('cx')}
				// ))
			}
		}

		for (let node in rootData) {
			let nodeL = rootData[node].lineTo ? Object.keys(rootData[node].lineTo).length : 0;
			if (nodeL > 0) svgLineTo(rootData[node].id)
		}

	}

	/*
		添加文件
	*/
	drawText(ele, text, x, y) {

		let setTxtL = this.option.text.length;

		ele.append('title').text(text)

		if (setTxtL) {
			let textR = text.replace(/[^\x00-\xff]/g, '❤❤');
			if (textR.length > setTxtL) {
				if (textR.slice(setTxtL, setTxtL+1) == '❤') {
					let _t = textR.slice(0, setTxtL);
					let xinL = _t.match(/❤/g).length;
					let _tL = _t.length - xinL;
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
	}

	// 绘制点
	drawPoint() {

		let _self = this;
		let linkArr = _self.pointArr;

		let addClassList = (classtag) => {

			let _cls = 'nodes-point'

			if (classtag) {
				_cls += ' ' + classtag;
			} 

			return _cls;

		}

		for (let i = 0, l = linkArr.length; i < l; i++) {
			
			let colH = (linkArr[i].length -1) * _self.option.perHeight / 2;
			let colW = (linkArr.length -1) * _self.option.perWidth / 2;

			for (let n = 0, m = linkArr[i].length; n < m; n++) {

				// 得到自己的 id
				let _thisPoint = linkArr[i][n];
				let _thisInfo = _thisPoint.position;
				let x = i * _self.option.perWidth + (_self.svgW/2) - colW;
				let y = n * _self.option.perHeight + (_self.svgH/2) - colH;

				// 保存点的位置
				_thisInfo.x = x;
				_thisInfo.y = y;
				
				let circleBox = _self.svgBody.append('g')
				.attr('id', _thisPoint.id)
				.classed('nodes-box', true)

				circleBox.append('circle')
				.attr('class', addClassList(_thisPoint.class))
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
					
					if (!_self.option.selectedMode) return;

					let className = 'focus';
					let _this = d3.select(this);

					if (!this.parentNode.matches(`.${className}`)) {
						if ( _self.option.selectedMode === 'single' ) {
							d3.selectAll('.focus').classed('focus', false)
						}
					}

					// 选择效果
					this.parentNode.classList.toggle('focus');

				});

				this.drawText(circleBox, _thisPoint.name, x, y)

			}
		};
	}

	// 绘制 marker
	drawMarker() {

		let markerBox = this.svgBody.append('svg:defs');
		let arrowArr = ['end-arrow', 'end-hover-arrow','end-focus-arrow','start-arrow', 'start-hover-arrow']
		let line = this.option.line;
		let refX = line ? (line.refX || 0): 0;
		let refY = line ? (line.refY || 0): 0;

		for (let i = 0, l = arrowArr.length; i < l; i++) {
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
	}

	init(option) {

		let _self = this;

		this.option = this.extendObj( this.option, option );

		_self.getType();

		// 计算最多个数行
		let maxTypeLength = Math.max.apply({}, (function() {
			let _arr = [];
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

		if (_self.option.autoWindows) {
			this.svg.attr('style', 'width:100%')
		}
	}

	setOption(option) {

		this.init( option );

		this.drawMarker();

		this.drawPoint();

		this.drawLine();

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

