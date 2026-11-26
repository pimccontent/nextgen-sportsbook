<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;

final class DeployAdminController
{
    public function show(): JsonResponse
    {
        $layout = (string) env('DEPLOY_URL_LAYOUT', env('URL_LAYOUT', 'path'));
        $domain = (string) env('DEPLOY_DOMAIN', env('DOMAIN', ''));

        $customer = (string) env('DEPLOY_CUSTOMER_URL', '');
        $admin = (string) env('DEPLOY_ADMIN_URL', '');
        $agent = (string) env('DEPLOY_AGENT_URL', '');
        $api = (string) env('DEPLOY_API_URL', '');

        if ($customer === '' && $domain !== '') {
            $customer = 'https://'.$domain;
            $admin = 'https://admin.'.$domain;
            $agent = $layout === 'hosts' ? 'https://agent.'.$domain : 'https://'.$domain.'/agent';
            $api = $layout === 'hosts' ? 'https://api.'.$domain.'/api/v1' : 'https://'.$domain.'/api/v1';
        }

        $dns = [];
        if ($domain !== '') {
            $dns[] = $domain;
            $dns[] = 'admin.'.$domain;
            if ($layout === 'hosts') {
                $dns[] = 'agent.'.$domain;
                $dns[] = 'api.'.$domain;
            }
        }

        return ApiResponse::success([
            'layout' => $layout !== '' ? $layout : 'path',
            'domain' => $domain !== '' ? $domain : null,
            'urls' => [
                'customer' => $customer !== '' ? $customer : null,
                'admin' => $admin !== '' ? $admin : null,
                'agent' => $agent !== '' ? $agent : null,
                'api' => $api !== '' ? $api : null,
                'api_health' => $api !== '' ? rtrim($api, '/').'/health' : null,
            ],
            'dns_required' => $dns,
            'update_command' => 'bash scripts/update-vps.sh',
            'notes' => [
                'Path layout uses 2 DNS A records (apex + admin).',
                'Agent lives at /agent on the apex domain; Admin stays on admin subdomain.',
                'Prebuilt images: set USE_PREBUILT_IMAGES=1 in .env.vps after publishing to your registry.',
            ],
        ]);
    }
}
