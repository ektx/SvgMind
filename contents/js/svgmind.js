
function SvgMind() {
	// 绘制区
	this.el = '';
	// 记录点的位置
	this.pointPosition = {};
	// 记录点的数组
	this.pointArr = [];

	this.option = {
		perHeight: 100,
		perWidth: 200,
		// 与父级相持平行,只有在自己的个数比父级的个数少时起用
		follow: true,
		circle: {
			r: 12
		},
		// 是否支持多选, treu 多选择 false 单选
		selectedMode: false,
		line: {
			refX: 0,
			refY: 0
		},
		text: {
			// start | middle | end 
			textAnchor: 'middle',
			dy: 0,
			dx: 0
		}
	}

}

SvgMind.prototype = {
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

	extendObj: function(obj, obj2) {
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
	
	// 获取每级的个数
	getType: function() {
	
		let typeArrIndex = 0;

		let doWith = (json, parentId) => {
			for (let i = 0, l = json.length; i < l; i++) {
				let _child = json[i].child;
				let _name = json[i].name;
				let _id = json[i].id;

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
						_self: json[i],
						_parent: [ parentId ]
					}

				} else {
					// 追加父级信息
					this.pointPosition[_id]._parent.push( parentId )
				}
			}

			typeArrIndex--;
		}

		doWith( this.option.data );

	},

	// 绘制线
	drawLine: function(json) {

		let _self = this;

		json.forEach(function(n,i) {

			// var lineBox = d3.select('#'+n.id); 
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
					// .attr('d', diagonal(
					// 	{x: thisPoint.attr('cx'), y: thisPoint.attr('cy')},
					// 	{x: childNodePoint.attr('cx'), y: childNodePoint.attr('cy')}
					// ))

				}

				_self.drawLine( n.child )

			}

		})
	},

	// 绘制点
	drawPoint: function() {

		let _self = this;
		let linkArr = _self.pointArr;

		for (let i = 0, l = linkArr.length; i < l; i++) {
			
			let colH = (linkArr[i].length -1) * _self.option.perHeight / 2;
			let colW = (linkArr.length -1) * _self.option.perWidth / 2;

			for (let n = 0, m = linkArr[i].length; n < m; n++) {

				let x = i * _self.option.perWidth + (_self.svgW/2) - colW;
				let y = n * _self.option.perHeight + (_self.svgH/2) - colH;

				if (i > 0) {
					// 如果要让点与父级平行
					if (_self.option.follow && linkArr[i].length <= linkArr[i -1].length) {
						let _p = linkArr[i][n];
						x = _self.pointPosition[_p]._self.x + _self.option.perWidth;
						y = _self.pointPosition[_p]._self.y;
					} 
				}

				// 保存点的位置
				_self.pointPosition[linkArr[i][n]].x = x;
				_self.pointPosition[linkArr[i][n]].y = y;
				
				let circleBox = _self.svgBody.append('g')
				.attr('id', linkArr[i][n].id)
				.classed('nodes-box', true)
				
				circleBox.append('circle')
				.classed('nodes-point', true)
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
					let className = 'focus';
					let _this = d3.select(this);

					if (!this.parentNode.matches(`.${className}`)) {
						if ( !_self.option.selectedMode ) {
							d3.selectAll('.focus').classed('focus', false)
						}
					}

					// 选择效果
					this.parentNode.classList.toggle('focus');

					// 移动居中
					// let moveX = _self.svgW / 2;
					// _self.events.selected.call(_self, moveX, 0, 1);

				});
				
				circleBox
				.append('text')
				.text(linkArr[i][n].name)
				.attr('text-anchor', _self.option.text.textAnchor)
				.attr('x', x)
				.attr('y', y)
				.attr('dy', _self.option.text.dy)
				.attr('dx', _self.option.text.dx)

			}
		};
	},

	// 绘制 marker
	drawMarker: function() {

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
	},

	events: {

		_self: this,

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

		selected: function(x, y, scale, duration) {
			
			duration = duration || 750;

			if (scale == 0) scale = 1;

			this.svg.transition()
			.duration(duration)
			.call(
				this.zoom.transform, 
				d3.zoomIdentity.translate(x, y)
				.scale(scale)
			)
		}
	},

	setOption: function(option) {

		this.option = this.extendObj( this.option, option );

		let _self = this;

		_self.getType();

		// 计算最多个数行
		var maxTypeLength = Math.max.apply({}, (function() {
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

		this.drawMarker();

		this.drawPoint();

		// this.drawLine(this.data)

		// 设置缩放比例
		// this.zoom = d3.zoom()
		// .scaleExtent([0, 100])
		// .on('zoom', ()=> {
		// 	this.svgBody
		// 	.attr('transform', 'translate(' + d3.event.transform.x + ',' + d3.event.transform.y + ') scale(' + d3.event.transform.k + ')');
		// } );

		// this.svg.call( this.zoom);

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


