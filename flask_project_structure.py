import os

def print_directory_structure(start_path='.'):
    include_dirs = [
        'data', 'model', 'static', 'templates'
    ]
    include_files = {
        'templates/html': [
            'board.html', 'chat.html', 'drink_info.html', 'home.html', 'index.html',
            'login.html', 'main.html', 'post_detail.html', 'post_form.html', 'Posts.html',
            'recommend.html', 'reservation_calendar.html', 'sch_filter.html', 'setting.html',
            'vote.html', 'write_post.html'
        ],
        '.': [
            'flaskapp.py', 'recommendation.py', 'flask_project_structure.py',
            '소셜로그인_구현방법.txt', '주류판단모델_구축방법.txt'
        ],
        'model': [
            'recomend_model.py', 'train_model.py'
        ]
    }

    for root, dirs, files in os.walk(start_path):
        level = root.replace(start_path, '').count(os.sep)
        indent = ' ' * 4 * (level)
        dir_name = os.path.basename(root)

        if dir_name in include_dirs:
            print('{}{}/'.format(indent, dir_name))
            subindent = ' ' * 4 * (level + 1)
            for f in files:
                if dir_name in include_files and f in include_files[dir_name]:
                    print('{}{}'.format(subindent, f))
            for d in dirs:
                if d in include_dirs:
                    print('{}{}/'.format(subindent, d))
                    
        if dir_name == 'html' and 'templates/html' in include_files:
            print('{}{}/'.format(indent, dir_name))
            subindent = ' ' * 4 * (level + 1)
            for f in files:
                if f in include_files['templates/html']:
                    print('{}{}'.format(subindent, f))

if __name__ == "__main__":
    start_path = '.'  # 현재 디렉토리부터 시작
    print("Flask Project Structure:")
    print_directory_structure(start_path)
